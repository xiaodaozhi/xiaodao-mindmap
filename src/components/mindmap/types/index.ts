export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  collapsed?: boolean;
}

export interface LayoutNode extends MindMapNode {
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutNode[];
  parentX?: number;
  parentY?: number;
  depth: number;
}

export interface ClipboardData {
  node: MindMapNode;
  isCut: boolean;
}

export interface Connection {
  from: { x: number; y: number };
  to: { x: number; y: number };
}
