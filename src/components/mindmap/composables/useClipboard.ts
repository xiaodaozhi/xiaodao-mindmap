import { ref, computed } from 'vue';
import type { MindMapNode, ClipboardData } from '../types';
import { deepClone } from './utils';

export function useClipboard() {
  const clipboard = ref<ClipboardData | null>(null);

  const hasClipboard = computed(() => clipboard.value !== null);

  function copyNode(node: MindMapNode) {
    clipboard.value = {
      node: deepClone(node),
      isCut: false,
    };
  }

  function cutNode(node: MindMapNode) {
    clipboard.value = {
      node: deepClone(node),
      isCut: true,
    };
  }

  function pasteNode(): MindMapNode | null {
    if (!clipboard.value) return null;
    const node = deepClone(clipboard.value.node);
    if (clipboard.value.isCut) {
      clipboard.value = null;
    }
    return node;
  }

  return { clipboard, hasClipboard, copyNode, cutNode, pasteNode };
}
