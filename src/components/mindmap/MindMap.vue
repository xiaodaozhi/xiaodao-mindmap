<template>
  <div
    ref="wrapperRef"
    :class="['mindmap-wrapper', `mindmap-theme-${theme}`]"
    :style="wrapperStyle"
  >
    <div class="canvas-toolbar">
      <button
        class="canvas-tb-btn"
        :disabled="!canUndo"
        :title="t('toolbar.undo')"
        @click="handleUndo"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M3 10h10a5 5 0 0 1 0 10H9" /><polyline points="7 6 3 10 7 14" /></svg>
      </button>
      <button
        class="canvas-tb-btn"
        :disabled="!canRedo"
        :title="t('toolbar.redo')"
        @click="handleRedo"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M21 10H11a5 5 0 0 0 0 10h4" /><polyline points="17 6 21 10 17 14" /></svg>
      </button>
      <button
        class="canvas-tb-btn"
        :disabled="!selectedNodeId"
        :title="t('toolbar.addChild')"
        @click="addChild"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><line
          x1="12"
          y1="5"
          x2="12"
          y2="19"
        /><line
          x1="5"
          y1="12"
          x2="19"
          y2="12"
        /></svg>
      </button>
      <button
        class="canvas-tb-btn"
        :title="t('toolbar.resetView')"
        @click="resetView"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
      </button>
      <button
        class="canvas-tb-btn"
        :disabled="!selectedNodeId || selectedNodeId === innerRoot.id"
        :title="t('toolbar.delete')"
        @click="deleteNode"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
      </button>
    </div>

    <div
      ref="containerRef"
      class="canvas-container"
      @mousedown="onCanvasMouseDown"
      @wheel.prevent="onCanvasWheel"
    >
      <svg
        ref="svgRef"
        :width="svgSize.width"
        :height="svgSize.height"
        :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`"
      >
        <!-- Connections -->
        <g v-if="layout.connections.length > 0">
          <path
            v-for="(conn, idx) in layout.connections"
            :key="'conn-' + idx"
            :d="getBezierPath(conn.from, conn.to)"
            fill="none"
            :stroke="'var(--mm-line-color)'"
            stroke-width="1.5"
          />
        </g>

        <!-- Nodes -->
        <g
          v-for="ln in layout.nodes"
          :key="ln.id"
          :class="['mm-node-group', nodeClass(ln)]"
          @mousedown.stop="onNodeMouseDown($event, ln)"
          @dblclick.stop="startEdit(ln)"
        >
          <!-- Node background -->
          <rect
            :x="ln.x"
            :y="ln.y"
            :width="ln.width"
            :height="ln.height"
            :rx="nodeRadius(ln)"
            :ry="nodeRadius(ln)"
            :fill="nodeFill(ln)"
            :stroke="selectedNodeId === ln.id ? 'var(--mm-selected-border)' : nodeBorder(ln)"
            :stroke-width="selectedNodeId === ln.id ? 2 : 1"
            class="mm-node-rect"
          />

          <!-- Text or editing input -->
          <foreignObject
            v-if="editingNodeId === ln.id"
            :x="ln.x"
            :y="ln.y"
            :width="ln.width"
            :height="ln.height"
          >
            <input
              ref="editInputRef"
              v-model="editText"
              xmlns="http://www.w3.org/1999/xhtml"
              :class="['mm-edit-input', nodeClass(ln)]"
              @blur="finishEdit"
              @keydown.enter="finishEdit"
              @keydown.escape="cancelEdit"
              @mousedown.stop
            >
          </foreignObject>

          <text
            v-else
            :x="ln.x + ln.width / 2"
            :y="ln.y + ln.height / 2"
            text-anchor="middle"
            dominant-baseline="central"
            :fill="nodeTextFill(ln)"
            :font-size="nodeFontSize(ln)"
            :font-weight="nodeFontWeight(ln)"
            font-family="Arial, sans-serif"
            class="mm-node-text"
            style="pointer-events: none; user-select: none;"
          >{{ ln.text || ' ' }}</text>

          <!-- Collapse/expand toggle -->
          <g
            v-if="hasRealChildren(ln.id)"
            class="mm-collapse-btn"
            @mousedown.stop
            @click.stop="toggleCollapse(ln)"
          >
            <circle
              :cx="ln.x + ln.width + 8"
              :cy="ln.y + ln.height / 2"
              r="7"
              :fill="'var(--mm-toolbar-bg)'"
              :stroke="'var(--mm-line-color)'"
              stroke-width="1"
            />
            <!-- collapsed: show + to expand -->
            <template v-if="ln.collapsed">
              <line
                :x1="ln.x + ln.width + 5"
                :y1="ln.y + ln.height / 2"
                :x2="ln.x + ln.width + 11"
                :y2="ln.y + ln.height / 2"
                :stroke="'var(--mm-line-color)'"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <line
                :x1="ln.x + ln.width + 8"
                :y1="ln.y + ln.height / 2 - 3"
                :x2="ln.x + ln.width + 8"
                :y2="ln.y + ln.height / 2 + 3"
                :stroke="'var(--mm-line-color)'"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </template>
            <!-- expanded: show − to collapse -->
            <line
              v-else
              :x1="ln.x + ln.width + 5"
              :y1="ln.y + ln.height / 2"
              :x2="ln.x + ln.width + 11"
              :y2="ln.y + ln.height / 2"
              :stroke="'var(--mm-line-color)'"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, type Ref } from 'vue';
import type { MindMapNode, LayoutNode } from './types';
import { useI18n } from './composables/useI18n';
import { useUndoRedo } from './composables/useUndoRedo';
import { useClipboard } from './composables/useClipboard';
import { useKeyboard } from './composables/useKeyboard';
import { useLayout } from './composables/useLayout';
import { deepClone, generateId } from './composables/utils';

const props = withDefaults(defineProps<{
  modelValue: MindMapNode;
  theme?: 'light' | 'dark';
  locale?: string;
  width?: string | number;
  height?: string | number;
}>(), {
  theme: 'light',
  locale: 'zh-CN',
});

const emit = defineEmits<{
  'update:modelValue': [value: MindMapNode];
}>();

// --- Wrapper style ---
const wrapperStyle = computed(() => {
  const style: Record<string, string> = {
    background: 'var(--mm-bg)',
  };
  if (props.width !== undefined) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
  }
  if (props.height !== undefined) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }
  return style;
});

// --- i18n ---
const localeRef = computed(() => props.locale || 'zh-CN');
const { t } = useI18n(localeRef);

// --- Internal reactive data ---
const innerRoot = ref<MindMapNode>(deepClone(props.modelValue));

watch(() => props.modelValue, (val) => {
  innerRoot.value = deepClone(val);
}, { deep: true });

function emitUpdate() {
  emit('update:modelValue', deepClone(innerRoot.value));
}

// --- Layout ---
const layout = useLayout(innerRoot as Ref<MindMapNode>);

// --- Undo/Redo ---
const { canUndo, canRedo, pushState, undo, redo } = useUndoRedo(
  () => innerRoot.value,
  (node) => {
    innerRoot.value = node;
    emitUpdate();
  },
);

function handleUndo() {
  undo();
}
function handleRedo() {
  redo();
}

// --- Clipboard ---
const { hasClipboard, copyNode, cutNode, pasteNode } = useClipboard();

// --- State ---
const selectedNodeId = ref<string | null>(null);
const editingNodeId = ref<string | null>(null);
const editText = ref('');
const editInputRef = ref<HTMLInputElement[]>();

const wrapperRef = ref<HTMLElement>();
const containerRef = ref<HTMLElement>();
const svgRef = ref<SVGSVGElement>();

// --- ViewBox / Panning / Zoom ---
const zoomLevels = [10, 17, 25, 33, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 1000];
const zoomIndex = ref(6); // index of 100%
const zoomLevel = computed(() => zoomLevels[zoomIndex.value]);

const viewBox = ref({ x: 0, y: 0, w: 1000, h: 700 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panViewStart = ref({ x: 0, y: 0 });
const containerRect = ref({ width: 1000, height: 700 });

const svgSize = computed(() => ({
  width: '100%',
  height: '100%',
}));

function updateContainerRect() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    containerRect.value = { width: rect.width, height: rect.height };
  }
}

function applyZoom() {
  const w = containerRect.value.width / ((zoomLevel.value ?? 100) / 100);
  const h = containerRect.value.height / ((zoomLevel.value ?? 100) / 100);
  viewBox.value = { ...viewBox.value, w, h };
}

function zoomAtPoint(clientX: number, clientY: number, newIndex: number) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const mx = (clientX - rect.left) / rect.width;   // 0..1
  const my = (clientY - rect.top) / rect.height;   // 0..1

  const oldW = containerRect.value.width / ((zoomLevel.value ?? 100) / 100);
  const oldH = containerRect.value.height / ((zoomLevel.value ?? 100) / 100);

  const svgX = viewBox.value.x + mx * oldW;
  const svgY = viewBox.value.y + my * oldH;

  zoomIndex.value = newIndex;
  const newScale = (zoomLevel.value ?? 100) / 100;
  const newW = containerRect.value.width / newScale;
  const newH = containerRect.value.height / newScale;

  viewBox.value = {
    x: svgX - mx * newW,
    y: svgY - my * newH,
    w: newW,
    h: newH,
  };
}

// --- Helper: find node by id ---
function findNodeById(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const found = findNodeById(c, id);
    if (found) return found;
  }
  return null;
}

// --- Helper: find parent of node ---
function findParentById(root: MindMapNode, id: string): MindMapNode | null {
  for (const c of root.children) {
    if (c.id === id) return root;
    const found = findParentById(c, id);
    if (found) return found;
  }
  return null;
}

// --- Helper: remove node from parent ---
function removeNodeById(root: MindMapNode, id: string): boolean {
  const idx = root.children.findIndex((c) => c.id === id);
  if (idx !== -1) {
    root.children.splice(idx, 1);
    return true;
  }
  for (const c of root.children) {
    if (removeNodeById(c, id)) return true;
  }
  return false;
}

// --- Add child ---
function addChild() {
  const targetId = selectedNodeId.value ?? innerRoot.value.id;
  const parent = findNodeById(innerRoot.value, targetId);
  if (!parent) return;
  pushState();
  const newNode: MindMapNode = {
    id: generateId(),
    text: t('node.defaultText'),
    children: [],
  };
  parent.children.push(newNode);
  selectedNodeId.value = newNode.id;
  emitUpdate();
  nextTick(() => startEditById(newNode.id));
}

// --- Add sibling ---
function addSibling() {
  if (!selectedNodeId.value || selectedNodeId.value === innerRoot.value.id) return;
  const parent = findParentById(innerRoot.value, selectedNodeId.value);
  if (!parent) return;
  pushState();
  const idx = parent.children.findIndex((c) => c.id === selectedNodeId.value);
  const newNode: MindMapNode = {
    id: generateId(),
    text: t('node.defaultText'),
    children: [],
  };
  parent.children.splice(idx + 1, 0, newNode);
  selectedNodeId.value = newNode.id;
  emitUpdate();
  nextTick(() => startEditById(newNode.id));
}

// --- Delete ---
function deleteNode() {
  if (!selectedNodeId.value || selectedNodeId.value === innerRoot.value.id) return;
  pushState();
  removeNodeById(innerRoot.value, selectedNodeId.value);
  selectedNodeId.value = null;
  editingNodeId.value = null;
  emitUpdate();
}

// --- Edit ---
function startEdit(ln: LayoutNode) {
  editingNodeId.value = ln.id;
  const node = findNodeById(innerRoot.value, ln.id);
  editText.value = node?.text === t('node.defaultText') ? '' : (node?.text ?? '');
  nextTick(() => {
    const inputs = document.querySelectorAll('.mm-edit-input');
    const last = inputs[inputs.length - 1] as HTMLInputElement;
    if (last) {
      last.focus();
      last.select();
    }
  });
}

function startEditById(id: string) {
  const node = findNodeById(innerRoot.value, id);
  if (!node) return;
  editingNodeId.value = id;
  editText.value = node.text === t('node.defaultText') ? '' : node.text;
  nextTick(() => {
    const inputs = document.querySelectorAll('.mm-edit-input');
    const last = inputs[inputs.length - 1] as HTMLInputElement;
    if (last) {
      last.focus();
      last.select();
    }
  });
}

function finishEdit() {
  if (!editingNodeId.value) return;
  const node = findNodeById(innerRoot.value, editingNodeId.value);
  if (node) {
    pushState();
    node.text = editText.value.trim() || t('node.defaultText');
    emitUpdate();
  }
  editingNodeId.value = null;
}

function cancelEdit() {
  editingNodeId.value = null;
}

// --- Cut/Copy/Paste ---
function handleCut() {
  if (!selectedNodeId.value || selectedNodeId.value === innerRoot.value.id) return;
  const node = findNodeById(innerRoot.value, selectedNodeId.value);
  if (!node) return;
  cutNode(node);
  pushState();
  removeNodeById(innerRoot.value, selectedNodeId.value);
  selectedNodeId.value = null;
  emitUpdate();
}

function handleCopy() {
  if (!selectedNodeId.value) return;
  const node = findNodeById(innerRoot.value, selectedNodeId.value);
  if (!node) return;
  copyNode(node);
}

function handlePaste(): boolean {
  if (!hasClipboard.value) return false;
  const node = pasteNode();
  if (!node) return false;
  const targetId = selectedNodeId.value ?? innerRoot.value.id;
  const parent = findNodeById(innerRoot.value, targetId);
  if (!parent) return false;
  pushState();
  // Regenerate IDs to avoid conflicts
  regenerateIds(node);
  parent.children.push(node);
  selectedNodeId.value = node.id;
  emitUpdate();
  return true;
}

function regenerateIds(node: MindMapNode) {
  node.id = generateId();
  for (const c of node.children) {
    regenerateIds(c);
  }
}

// --- Navigation (arrow key sibling selection) ---
function selectPrevSibling() {
  if (!selectedNodeId.value || selectedNodeId.value === innerRoot.value.id) return;
  const parent = findParentById(innerRoot.value, selectedNodeId.value);
  if (!parent) return;
  const idx = parent.children.findIndex((c) => c.id === selectedNodeId.value);
  if (idx > 0) {
    selectedNodeId.value = parent.children[idx - 1]!.id;
  }
}

function selectNextSibling() {
  if (!selectedNodeId.value || selectedNodeId.value === innerRoot.value.id) return;
  const parent = findParentById(innerRoot.value, selectedNodeId.value);
  if (!parent) return;
  const idx = parent.children.findIndex((c) => c.id === selectedNodeId.value);
  if (idx < parent.children.length - 1) {
    selectedNodeId.value = parent.children[idx + 1]!.id;
  }
}

function selectParentNode() {
  if (!selectedNodeId.value || selectedNodeId.value === innerRoot.value.id) return;
  const parent = findParentById(innerRoot.value, selectedNodeId.value);
  if (parent) {
    selectedNodeId.value = parent.id;
  }
}

function selectFirstChild() {
  if (!selectedNodeId.value) return;
  const node = findNodeById(innerRoot.value, selectedNodeId.value);
  if (node && node.children.length > 0) {
    selectedNodeId.value = node.children[0]!.id;
  }
}

// --- Keyboard ---
useKeyboard({
  onUndo: handleUndo,
  onRedo: handleRedo,
  onCut: handleCut,
  onCopy: handleCopy,
  onPaste: handlePaste,
  onTab: addChild,
  onEnter: addSibling,
  onDelete: deleteNode,
  onEscape: () => {
    if (editingNodeId.value) {
      cancelEdit();
    } else {
      selectedNodeId.value = null;
    }
  },
  onArrowUp: selectPrevSibling,
  onArrowDown: selectNextSibling,
  onArrowLeft: selectParentNode,
  onArrowRight: selectFirstChild,
});

// --- Collapse/Expand ---
function hasRealChildren(id: string): boolean {
  const node = findNodeById(innerRoot.value, id);
  return node ? node.children.length > 0 : false;
}

function toggleCollapse(ln: LayoutNode) {
  const node = findNodeById(innerRoot.value, ln.id);
  if (!node) return;
  pushState();
  node.collapsed = !node.collapsed;
  emitUpdate();
}

// --- Node styling by depth (0=root, 1=level2, 2+=normal) ---
function nodeClass(ln: LayoutNode): string {
  if (ln.depth === 0) return 'mm-node--root';
  if (ln.depth === 1) return 'mm-node--level2';
  return 'mm-node--normal';
}

function nodeFill(ln: LayoutNode): string {
  if (ln.depth === 0) return 'var(--mm-node-root-bg)';
  if (ln.depth === 1) return 'var(--mm-node-level2-bg)';
  return 'var(--mm-node-bg)';
}

function nodeBorder(ln: LayoutNode): string {
  if (ln.depth === 0) return 'var(--mm-node-root-border)';
  if (ln.depth === 1) return 'var(--mm-node-level2-border)';
  return 'var(--mm-node-border)';
}

function nodeTextFill(ln: LayoutNode): string {
  if (ln.depth === 0) return 'var(--mm-node-root-text)';
  if (ln.depth === 1) return 'var(--mm-node-level2-text)';
  return 'var(--mm-node-text)';
}

function nodeFontSize(ln: LayoutNode): number {
  if (ln.depth === 0) return 16;
  if (ln.depth === 1) return 14;
  return 13;
}

function nodeFontWeight(ln: LayoutNode): string {
  if (ln.depth === 0) return 'bold';
  if (ln.depth === 1) return '600';
  return 'normal';
}

function nodeRadius(_ln: LayoutNode): number {
  return 4;
}

// --- Bezier path ---
function getBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const dx = to.x - from.x;
  const cp1x = from.x + dx * 0.4;
  const cp1y = from.y;
  const cp2x = to.x - dx * 0.4;
  const cp2y = to.y;
  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
}

// --- Mouse events ---
function onNodeMouseDown(e: MouseEvent, ln: LayoutNode) {
  if (e.button !== 0) return;
  selectedNodeId.value = ln.id;
}

function onCanvasMouseDown(e: MouseEvent) {
  if (e.button === 0) {
    // Start panning
    isPanning.value = true;
    panStart.value = { x: e.clientX, y: e.clientY };
    panViewStart.value = { x: viewBox.value.x, y: viewBox.value.y };
  }
}

function onMouseMove(e: MouseEvent) {
  if (!isPanning.value) return;
  const scale = (zoomLevel.value ?? 100) / 100;
  const dx = (e.clientX - panStart.value.x) / scale;
  const dy = (e.clientY - panStart.value.y) / scale;
  viewBox.value.x = panViewStart.value.x - dx;
  viewBox.value.y = panViewStart.value.y - dy;
}

function onMouseUp() {
  isPanning.value = false;
}

function onCanvasWheel(e: WheelEvent) {
  let newIndex = zoomIndex.value;
  if (e.deltaY < 0) {
    if (zoomIndex.value < zoomLevels.length - 1) newIndex = zoomIndex.value + 1;
  } else {
    if (zoomIndex.value > 0) newIndex = zoomIndex.value - 1;
  }
  if (newIndex === zoomIndex.value) return;
  zoomAtPoint(e.clientX, e.clientY, newIndex);
}

// --- Click on empty canvas to deselect ---
watch(selectedNodeId, () => { /* tracked */ });

function resetView() {
  zoomIndex.value = 6; // 100%
  initView();
}

function initView() {
  updateContainerRect();
  applyZoom();

  // Position: root node centered vertically, shifted left 25% if has children
  const rootNode = layout.value.nodes.find((n) => n.depth === 0);
  if (!rootNode) return;
  const scale = (zoomLevel.value ?? 100) / 100;
  const rx = rootNode.x + rootNode.width / 2;
  const ry = rootNode.y + rootNode.height / 2;
  const hasChildren = rootNode.children.length > 0;
  const centerX = hasChildren ? 0.25 : 0.5;
  viewBox.value.x = rx - containerRect.value.width * centerX / scale;
  viewBox.value.y = ry - containerRect.value.height * 0.5 / scale;
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  let initialized = false;
  const resizeObserver = new ResizeObserver(() => {
    updateContainerRect();
    applyZoom();
    if (!initialized && containerRect.value.width > 0 && containerRect.value.height > 0 && layout.value.nodes.length > 0) {
      initialized = true;
      initView();
    }
  });
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }

  // Also watch layout changes for initial data load
  watch(layout, (val) => {
    updateContainerRect();
    applyZoom();
    if (!initialized && containerRect.value.width > 0 && containerRect.value.height > 0 && val.nodes.length > 0) {
      initialized = true;
      initView();
    }
  }, { deep: true });
});
</script>

<style scoped>
/* ---- Theme CSS Variables ---- */
.mindmap-theme-light {
  --mm-bg: #ffffff;
  --mm-node-root-bg: #4A90D9;
  --mm-node-root-border: #3a7bc8;
  --mm-node-root-text: #ffffff;
  --mm-node-level2-bg: #e8f0fe;
  --mm-node-level2-border: #a8c8f0;
  --mm-node-level2-text: #2a5a8a;
  --mm-node-bg: #f5f5f5;
  --mm-node-border: #cccccc;
  --mm-node-text: #333333;
  --mm-line-color: #b0b0b0;
  --mm-selected-border: #4A90D9;
  --mm-toolbar-bg: #ffffff;
  --mm-toolbar-border: #dddddd;
  --mm-toolbar-text: #333333;
  --mm-toolbar-hover: #e8e8e8;
}

.mindmap-theme-dark {
  --mm-bg: #1e1e1e;
  --mm-node-root-bg: #6db3f2;
  --mm-node-root-border: #4a90d9;
  --mm-node-root-text: #1a1a1a;
  --mm-node-level2-bg: #2a3a50;
  --mm-node-level2-border: #4a6a90;
  --mm-node-level2-text: #a0c4e8;
  --mm-node-bg: #2d2d2d;
  --mm-node-border: #555555;
  --mm-node-text: #e0e0e0;
  --mm-line-color: #666666;
  --mm-selected-border: #6db3f2;
  --mm-toolbar-bg: #2d2d2d;
  --mm-toolbar-border: #444444;
  --mm-toolbar-text: #e0e0e0;
  --mm-toolbar-hover: #3d3d3d;
}

/* ---- Wrapper ---- */
.mindmap-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

/* ---- Canvas ---- */
.canvas-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.canvas-container:active {
  cursor: grabbing;
}

.canvas-container svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---- Toolbar ---- */
.canvas-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 50;
}

.canvas-tb-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--mm-toolbar-border);
  border-radius: 4px;
  background: var(--mm-toolbar-bg);
  color: var(--mm-toolbar-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s, opacity 0.15s;
  opacity: 0.9;
}

.canvas-tb-btn:hover:not(:disabled) {
  background: var(--mm-toolbar-hover);
  opacity: 1;
}

.canvas-tb-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* ---- Node hover ---- */
.mm-node-group {
  cursor: pointer;
}

.mm-node-rect:hover {
  filter: brightness(0.95);
}

.mindmap-theme-dark .mm-node-rect:hover {
  filter: brightness(1.2);
}

/* ---- Collapse button ---- */
.mm-collapse-btn {
  cursor: pointer;
}

.mm-collapse-btn circle:hover {
  fill: var(--mm-toolbar-hover);
}
.mm-edit-input {
  width: 100%;
  height: 100%;
  border: 2px solid var(--mm-selected-border);
  border-radius: 4px;
  outline: none;
  padding: 2px 6px;
  font-size: 13px;
  font-family: Arial, sans-serif;
  text-align: center;
  background: var(--mm-bg);
  color: var(--mm-node-text);
  box-sizing: border-box;
}
</style>
