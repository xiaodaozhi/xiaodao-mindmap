import { ref, computed } from 'vue';
import type { MindMapNode } from '../types';
import { deepClone } from './utils';

export function useUndoRedo(getCurrentNode: () => MindMapNode, onRestore: (node: MindMapNode) => void) {
  const undoStack = ref<MindMapNode[]>([]);
  const redoStack = ref<MindMapNode[]>([]);
  const maxStackSize = 50;

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function pushState() {
    const snapshot = deepClone(getCurrentNode());
    undoStack.value.push(snapshot);
    if (undoStack.value.length > maxStackSize) {
      undoStack.value.shift();
    }
    redoStack.value = [];
  }

  function undo() {
    if (!canUndo.value) return;
    redoStack.value.push(deepClone(getCurrentNode()));
    const prev = undoStack.value.pop()!;
    onRestore(deepClone(prev));
  }

  function redo() {
    if (!canRedo.value) return;
    undoStack.value.push(deepClone(getCurrentNode()));
    const next = redoStack.value.pop()!;
    onRestore(deepClone(next));
  }

  return { canUndo, canRedo, pushState, undo, redo };
}
