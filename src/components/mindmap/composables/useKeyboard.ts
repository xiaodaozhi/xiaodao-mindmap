import { onMounted, onUnmounted } from 'vue';

interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => boolean;  // return true if paste was handled
  onTab?: () => void;
  onEnter?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export function useKeyboard(handlers: ShortcutHandlers) {
  function isModKey(e: KeyboardEvent): boolean {
    return e.ctrlKey || e.metaKey;
  }

  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    // Don't handle if target is an input/textarea (except escape)
    if (
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.isContentEditable
    ) {
      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
      return;
    }

    if (isModKey(e)) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          handlers.onRedo?.();
        } else {
          handlers.onUndo?.();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handlers.onRedo?.();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handlers.onCut?.();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handlers.onCopy?.();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        // Only handle paste if internal clipboard has content
        if (handlers.onPaste?.()) {
          // Already handled
        }
      }
    } else {
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          handlers.onTab?.();
          break;
        case 'Enter':
          e.preventDefault();
          handlers.onEnter?.();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handlers.onDelete?.();
          break;
        case 'Escape':
          handlers.onEscape?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlers.onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlers.onArrowDown?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onArrowLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onArrowRight?.();
          break;
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
  });
}
