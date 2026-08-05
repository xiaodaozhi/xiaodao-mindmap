import { computed, type Ref } from 'vue';
import type { MindMapNode, LayoutNode, Connection } from '../types';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 36;
const H_GAP = 80;
const V_GAP = 20;

const STEP_X = NODE_WIDTH + H_GAP;

interface MeasuredNode {
  node: LayoutNode;
  totalHeight: number;
  // contour[depth] = { min, max } relative y range of nodes at that depth within this subtree
  contour: Map<number, { min: number; max: number }>;
}

function measureSubtree(node: MindMapNode, depth: number = 0): MeasuredNode {
  const ln: LayoutNode = {
    ...node,
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    children: [],
    depth,
  };

  const contour = new Map<number, { min: number; max: number }>();
  // This node itself contributes to the contour at its own depth
  contour.set(depth, { min: 0, max: NODE_HEIGHT });

  if (!node.children || node.children.length === 0 || node.collapsed) {
    return { node: ln, totalHeight: NODE_HEIGHT, contour };
  }

  // Recursively measure children
  const measuredChildren = node.children.map((c) => measureSubtree(c, depth + 1));
  ln.children = measuredChildren.map((m) => m.node);

  // Arrange children vertically, using contours to avoid overlap
  let currentY = 0;
  for (let i = 0; i < measuredChildren.length; i++) {
    const child = measuredChildren[i];
    if (i > 0) {
      // Compute the minimum absolute y for this child to avoid overlap with previous sibling
      // by checking contours across all shared depth levels
      const prevChild = measuredChildren[i - 1];
      let minY = currentY;
      for (let d = depth + 1; ; d++) {
        const prevContour = prevChild!.contour.get(d);
        const currContour = child!.contour.get(d);
        if (!prevContour && !currContour) break;
        if (prevContour && currContour) {
          // child.y + currContour.min >= prevChild.y + prevContour.max + V_GAP
          const contourY = prevChild!.node.y + prevContour.max - currContour.min + V_GAP;
          if (contourY > minY) minY = contourY;
        }
      }
      currentY = minY;
    }
    child!.node.y = currentY;
    currentY += child!.totalHeight;
  }

  // Center children vertically around this node
  const totalChildrenHeight = currentY;
  const center = totalChildrenHeight / 2;
  const offset = center - NODE_HEIGHT / 2;
  for (const child of measuredChildren) {
    child.node.y -= offset;
    child.node.x = STEP_X;
  }

  // Shift contour entries after centering and offset by x
  for (const child of measuredChildren) {
    for (const [d, range] of child.contour) {
      const adjusted = { min: range.min + child.node.y, max: range.max + child.node.y };
      const existing = contour.get(d);
      if (existing) {
        contour.set(d, {
          min: Math.min(existing.min, adjusted.min),
          max: Math.max(existing.max, adjusted.max),
        });
      } else {
        contour.set(d, adjusted);
      }
    }
  }

  const totalHeight = Math.max(NODE_HEIGHT, currentY);
  return { node: ln, totalHeight, contour };
}

export function useLayout(root: Ref<MindMapNode | null>) {
  const layoutData = computed(() => {
    if (!root.value) return { nodes: [] as LayoutNode[], connections: [] as Connection[] };

    const result = measureSubtree(root.value);
    const nodes: LayoutNode[] = [];

    function flatten(n: LayoutNode, parent?: LayoutNode) {
      if (parent) {
        n.x += parent.x;
        n.y += parent.y;
        n.parentX = parent.x + NODE_WIDTH;
        n.parentY = parent.y + NODE_HEIGHT / 2;
      }
      nodes.push(n);
      for (const c of n.children) {
        flatten(c, n);
      }
    }

    flatten(result.node);

    const connections: Connection[] = [];
    for (const n of nodes) {
      if (n.parentX !== undefined && n.parentY !== undefined) {
        connections.push({
          from: { x: n.parentX, y: n.parentY },
          to: { x: n.x, y: n.y + NODE_HEIGHT / 2 },
        });
      }
    }

    return { nodes, connections, totalWidth: getTotalWidth(result.node), totalHeight: getTotalHeight(nodes) };
  });

  return layoutData;
}

function getTotalWidth(node: LayoutNode): number {
  let maxX = node.x + NODE_WIDTH;
  for (const c of node.children) {
    maxX = Math.max(maxX, getTotalWidth(c));
  }
  return maxX;
}

function getTotalHeight(nodes: LayoutNode[]): number {
  let maxY = 0;
  let minY = Infinity;
  for (const n of nodes) {
    if (n.y < minY) minY = n.y;
    if (n.y + NODE_HEIGHT > maxY) maxY = n.y + NODE_HEIGHT;
  }
  return maxY - minY;
}
