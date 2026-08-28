# Xiaodao MindMap

[中文](./README.ZH.md) | **English** | [Demo](https://mindmap.xdz.me)

[![Downloads](https://img.shields.io/npm/d18m/xiaodao-mindmap)](https://www.npmjs.com/package/xiaodao-mindmap)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.4+-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg)](https://vitejs.dev/)

A feature-rich, interactive mind map component for **Vue 3**, written in **TypeScript** and bundled with **Vite**. Render hierarchical mind maps on an SVG canvas with inline editing, drag-and-drop restructuring, undo/redo, cut/copy/paste, collapse/expand, zoom and pan, full keyboard control, light/dark themes, and internationalization. All pure logic lives in small, single-purpose composables, keeping the view layer thin and the code easy to follow or extend.

![Preview](img/preview.png)

---

## Features

### Core

- **SVG canvas editing**: click, double-click, pan, and restructure nodes directly on an SVG canvas.
- **v-model binding**: two-way data binding keeps the mind map data in sync with your application state.
- **Drag and drop restructuring**: drag any node onto another to reparent it as a child; a live drop indicator and ghost preview show where it will land.
- **Zoom and pan**: toolbar zoom buttons, mouse-wheel zoom (anchored at the cursor), drag-to-pan on empty canvas, plus pinch-zoom on touch devices.
- **Collapse and expand**: inline `+` / `−` toggle buttons on any node that has children.
- **Undo and redo**: toolbar buttons and keyboard shortcuts backed by a 50-state history stack.
- **Cut, copy, and paste**: an internal clipboard for moving or copying subtrees within the canvas.
- **Inline text editing**: double-click any node (or press Enter on a new node) to edit its text in place via an SVG `foreignObject` input.
- **Sized container**: control the canvas size with the `width` / `height` props (defaults to 100% of the parent).

### Layout and Rendering

- **Tree layout algorithm**: automatic left-to-right tree layout with contour-based overlap avoidance (see [Layout Algorithm](#layout-algorithm)).
- **Bezier curves**: smooth cubic Bezier connections between parent and child nodes.
- **Depth-based styling**: root, level-2, and deeper nodes have distinct visual styles.

### Interaction

- **Keyboard shortcuts**: Tab, Enter, Delete, arrow keys, and standard Ctrl/Cmd combinations (see [Keyboard Shortcuts](#keyboard-shortcuts)).
- **Mouse operations**: click to select, double-click to edit, drag empty canvas to pan, drag a node onto another to reparent.
- **Touch operations**: tap to select, one-finger pan, two-finger pinch-zoom, one-finger drag to reparent.
- **Toolbar**: a vertical toolbar with 8 buttons (undo, redo, zoom in, zoom out, reset view, add child, edit, delete).

### Visual

- **Light and dark theme**: toggle via the `theme` prop; all colors are driven by CSS variables.
- **Internationalization (i18n)**: built-in Chinese (`zh-CN`, default) and English (`en-US`) translations, switched via the `locale` prop.

---

## Installation

```bash
# npm (primary; this repo ships a package-lock.json)
npm install xiaodao-mindmap

# pnpm / yarn also work
pnpm add xiaodao-mindmap
yarn add xiaodao-mindmap
```

### Peer Dependencies

- `vue` ^3.4.0

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/xiaodaozhi/xiaodao-mindmap.git
cd xiaodao-mindmap

# Install dependencies
npm install

# Start dev server (demo app with theme / language toggles)
npm run dev
```

Navigate to `http://localhost:5173` to see the demo application.

---

## Basic Usage

```vue
<template>
  <MindMap v-model="mindMapData" theme="light" locale="zh-CN" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MindMap from 'xiaodao-mindmap'
import type { MindMapNode } from 'xiaodao-mindmap'

const mindMapData = ref<MindMapNode>({
  id: 'root',
  text: 'Central Topic',
  children: [
    {
      id: 'c1',
      text: 'Branch 1',
      children: [
        { id: 'c1a', text: 'Leaf 1.1', children: [] },
        { id: 'c1b', text: 'Leaf 1.2', children: [] },
      ],
    },
    {
      id: 'c2',
      text: 'Branch 2',
      children: [],
    },
  ],
})
</script>
```

When using the source repository directly:

```ts
import MindMap from './components/mindmap/MindMap.vue'
import type { MindMapNode } from './components/mindmap/types'
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `MindMapNode` | *required* | Root node of the mind map data tree (bound with `v-model`). |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme. Switches the `mindmap-theme-*` class on the wrapper. |
| `locale` | `string` | `'zh-CN'` | UI language key. Built-in: `'zh-CN'` and `'en-US'`. Unknown keys fall back to `'en-US'`. |
| `width` | `string \| number` | *(100%)* | Wrapper width. A `number` is treated as pixels; a `string` is used as-is (e.g. `'50vw'`, `'600px'`). |
| `height` | `string \| number` | *(100%)* | Wrapper height. Same rules as `width`. |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `MindMapNode` | Emitted (with a deep clone of the new tree) after every mutation: edits, adds, deletes, moves, collapse toggles, undo/redo, and paste. |

---

## Data Model

### `MindMapNode`

The external data format used for `v-model` two-way binding:

```typescript
interface MindMapNode {
  id: string            // Unique identifier (crypto.randomUUID())
  text: string          // Display text
  children: MindMapNode[]  // Child nodes (a node with an empty array is a leaf)
  collapsed?: boolean   // When true, children are hidden
}
```

- The root node is the whole tree; `children` nests arbitrarily deep.
- When a node is pasted, all of its `id`s are regenerated to avoid key collisions.

### Type Exports

```typescript
import type {
  MindMapNode,     // Public contract exchanged via v-model
  LayoutNode,      // Internal enriched shape (geometry + depth), not exposed to parent
  Connection,      // One Bezier link endpoint pair { from, to }
  ClipboardData,   // { node, isCut }
} from 'xiaodao-mindmap'
```

---

## Architecture

```
xiaodao-mindmap/
├── index.html                          # Demo entry HTML (sets the page <title>)
├── package.json                        # Dependencies, scripts, package metadata
├── vite.config.ts                      # Library build configuration
├── vite.demo.config.ts                 # Demo (app) build configuration -> dist-demo/
├── tsconfig.json                       # TypeScript config (app / type-check)
├── tsconfig.node.json                  # TypeScript config for Vite config files
├── tsconfig.build.json                 # TypeScript config for emitting .d.ts
├── dist/                               # Library build output (git-ignored, published)
├── dist-demo/                          # Demo build output (git-ignored)
├── src/
│   ├── main.ts                         # Demo bootstrap
│   ├── App.vue                         # Demo app with theme / locale toggles
│   ├── style.css                       # Global reset styles (demo)
│   ├── env.d.ts                        # Vite / Vue type declarations
│   ├── index.ts                        # Library entry: exports MindMap + types
│   └── components/
│       └── mindmap/
│           ├── MindMap.vue             # Main component (template + logic + styles)
│           ├── style.css               # Component-level reset styles
│           ├── types/
│           │   └── index.ts            # TypeScript type definitions
│           ├── i18n/
│           │   ├── zh-CN.ts            # Chinese translations (default)
│           │   └── en-US.ts            # English translations
│           └── composables/
│               ├── useI18n.ts          # Internationalization composable
│               ├── useUndoRedo.ts      # Undo / redo stack management
│               ├── useClipboard.ts     # Cut / copy / paste internal clipboard
│               ├── useKeyboard.ts      # Global keyboard shortcut handler
│               ├── useLayout.ts        # Tree layout algorithm
│               └── utils.ts            # Shared utilities (deepClone, generateId)
└── img/
    └── preview.png                     # README preview image
```

### Design Principles

- **Single source of truth**: `innerRoot` (a deep clone of `modelValue`) is the only mutable copy. `props.modelValue` is treated as immutable input.
- **One-way data flow**: `modelValue` -> `innerRoot` (deep clone, reactive) -> `useLayout` computed -> SVG render. Every mutation emits a deep clone back out via `update:modelValue`.
- **Thin view plus composables**: all pure logic lives in small, single-responsibility composables under `composables/`; `MindMap.vue` only owns view state and SVG/DOM interaction.
- **Contour-based layout**: the layout algorithm prevents overlap between cousin subtrees at every depth level, not just immediate children.
- **CSS-variable theming**: every color is a `--mm-*` custom property, so consumers can reskin the component without touching its code.
- **SVG `viewBox` zoom**: zoom and pan are expressed purely as `viewBox` changes, keeping hit-testing correct at any scale.

The full design (data flow, the contour layout algorithm, undo/redo, clipboard, keyboard, drag-and-drop mechanics, zoom/pan, and theming) is documented in **[DOC.md](./DOC.md)** (中文版见 **[DOC.ZH.md](./DOC.ZH.md)**).

---

## Layout Algorithm

The tree is laid out left-to-right using a contour-based algorithm (`composables/useLayout.ts`):

1. **Measure**: recursively compute each subtree's relative `y`, its `totalHeight`, and a **contour** (`Map<depth, {min, max}>`) describing the vertical span it occupies at each depth. A single child is placed directly to the right of its parent (no vertical offset); multiple children are stacked and then centered around the parent.
2. **Flatten**: accumulate absolute `x`/`y` by adding parent offsets, compute the connection anchor on the parent, and emit one `Connection` per non-root node.

Key constants: `NODE_WIDTH = 120`, `NODE_HEIGHT = 36`, `H_GAP = 80`, `V_GAP = 20`, `STEP_X = 200`. Because the contour is tracked per depth, cousins never collide even several levels down. See **[DOC.md](./DOC.md)** for the complete algorithm.

---

## Drag and Drop (Reparenting)

Drag any node onto another to reparent it (`MindMap.vue` + composables):

- A **4px threshold** must be crossed before a drag begins, so a simple tap just selects the node.
- On drag start, `pushState()` snapshots the pre-move tree (one undo step for the whole move), the node is **removed** so siblings reflow live, and a ghost follows the cursor.
- The **drop indicator** (dashed placeholder) shows precisely where the node will land. A target that is the dragged node itself or its descendant is rejected.
- On cancel or no-op, the node is restored and the snapshot is discarded (`popUndo()`), so no spurious history entry is created.

See **[DOC.md](./DOC.md)** for the full mechanics.

---

## Keyboard Shortcuts

### Navigation

| Keys | Action |
|------|--------|
| `↑` / `↓` | Select previous / next sibling |
| `←` | Select parent node |
| `→` | Select first child |

### Editing

| Keys | Action |
|------|--------|
| `Tab` | Add a child node to the selection and enter edit mode |
| `Enter` | Add a sibling node to the selection and enter edit mode |
| `Delete` / `Backspace` | Delete the selected non-root node |
| `Double-click` | Edit node text in place |
| `Enter` (on a new node) | Commit the new node's text |
| `Escape` | Cancel editing / deselect |

### Clipboard and History

| Keys | Action |
|------|--------|
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` / `Cmd + Shift + Z` | Redo |
| `Ctrl + X` / `Cmd + X` | Cut node |
| `Ctrl + C` / `Cmd + C` | Copy node |
| `Ctrl + V` / `Cmd + V` | Paste node |

> **Notes:**
> - Paste only accepts content copied or cut from within the mind map canvas. System-clipboard text is ignored.
> - Shortcuts are ignored while typing in the inline edit input (except `Escape`).

---

## Toolbar

A vertical toolbar is anchored at the top-right corner of the canvas:

| Button | Availability | Description |
|--------|--------------|-------------|
| Undo | always (disabled when nothing to undo) | Reverts the last action |
| Redo | always (disabled when nothing to redo) | Re-applies the last undone action |
| Zoom In | disabled at max zoom | Increases zoom, centered on the canvas |
| Zoom Out | disabled at min zoom | Decreases zoom, centered on the canvas |
| Reset View | always | Resets zoom to 100% and re-centers the root |
| Add Child | only when a node is selected | Adds a child to the selected node and enters edit mode |
| Edit | only when a node is selected | Enters inline edit mode for the selected node |
| Delete | only when a non-root node is selected | Deletes the selected node |

Zoom levels (percent): `10, 25, 33, 50, 75, 100, 150, 200, 300, 500, 700, 1000` (default `100%`).

---

## Mouse Operations

| Action | How |
|--------|-----|
| Select a node | Click the node |
| Edit node text | Double-click the node |
| Deselect | Click on empty canvas area |
| Pan the canvas | Drag on empty canvas area |
| Toggle collapse | Click the `+` / `−` button on a node's right side |
| Reparent a node | Drag a node onto another node (or into its children region); release to drop it as a child |

---

## Touch Operations

| Action | How |
|--------|-----|
| Select | Tap a node |
| Pan | Drag with one finger on empty canvas |
| Pinch zoom | Spread / pinch with two fingers |
| Reparent | Drag a node with one finger onto another node |

---

## Theming

All colors are CSS custom properties scoped under the `.mindmap-theme-light` and `.mindmap-theme-dark` classes on the wrapper. Override any of them from your own stylesheet to reskin the component without touching its code:

```css
.mindmap-theme-light {
  --mm-bg: #ffffff;
  --mm-node-root-bg: #4A90D9;
  --mm-node-root-text: #ffffff;
  --mm-node-level2-bg: #e8f0fe;
  --mm-node-level2-text: #2a5a8a;
  --mm-node-bg: #f5f5f5;
  --mm-node-text: #333333;
  --mm-line-color: #b0b0b0;
  --mm-selected-border: #4A90D9;
  /* see MindMap.vue for the full variable list */
}
```

### Custom Theme

Switch themes via the `theme` prop, or wrap the component and override CSS variables for full customization:

```vue
<template>
  <div style="--mm-bg: #1a1a2e; --mm-node-text: #e0e0e0;">
    <MindMap v-model="data" theme="dark" />
  </div>
</template>
```

---

## Internationalization

Translations live in `src/components/mindmap/i18n/{zh-CN,en-US}.ts` as flat key to string maps. The `useI18n` composable resolves the active locale (falling back to `en-US` for unknown keys) and exposes `t(key)`.

To add a language, create a new file in `i18n/`, register it in `useI18n.ts` (`locales`), and pass its key via the `locale` prop. Current keys include `toolbar.*` (undo, redo, addChild, edit, delete, resetView, zoomIn, zoomOut) and `node.*` (addChild, addSibling, delete, edit, copy, cut, paste, defaultText).

---

## Development

```bash
# Install dependencies
npm install

# Start dev server (with hot module replacement)
npm run dev

# Type check only
npm run typecheck
```

The dev server runs on `http://localhost:5173` by default.

---

## Building

```bash
# Production build (type-check + vite build)
npm run build

# Build the standalone demo page into dist-demo/
npm run build:demo

# Preview the production build
npm run preview
```

### Build Output

| File | Description |
|------|-------------|
| `dist/xiaodao-mindmap.js` | ES module (for bundlers) |
| `dist/xiaodao-mindmap.umd.cjs` | UMD bundle (for direct `<script>` usage) |
| `dist/style.css` | Extracted stylesheet |
| `dist/index.d.ts` | TypeScript declaration entry |

### CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/publish.yml`) that builds and publishes the library to npm on release.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Vue 3 (Composition API + `<script setup>`) | ^3.4 |
| Build | Vite | ^5.4 |
| Language | TypeScript (strict) | ^5.4 |
| Rendering | SVG (DOM + `<path>` Bezier) | - |
| Type Checker | vue-tsc | ^2.0 |
| Package Manager | npm | - |
| CSS | Scoped CSS + CSS Custom Properties | - |

---

## Roadmap

### Near-term

- [x] SVG canvas editing (click, double-click, pan, restructure)
- [x] v-model two-way binding
- [x] Drag and drop reparenting (with live drop indicator + ghost)
- [x] Zoom and pan (wheel, toolbar, pinch)
- [x] Collapse and expand
- [x] Undo and redo (50 steps)
- [x] Cut, copy, and paste (internal clipboard)
- [x] Inline text editing (SVG `foreignObject`)
- [x] Light and dark theme
- [x] Internationalization (zh-CN / en-US)
- [x] Bezier connections + contour-based layout

### Mid-term

- [ ] Multiple root nodes / forest support
- [ ] Top-down and right-to-left layout directions
- [ ] Node icons, images, and badges
- [ ] Search and quick-jump
- [ ] Mini-map for large maps
- [ ] Export to PNG / SVG / JSON
- [ ] Collaborative editing

### Long-term

- [ ] Plugin system for custom node renderers
- [ ] Persistence adapters (offline-first)
- [ ] Mobile-optimized toolbar

---

## Browser Compatibility

Requires a modern browser with support for:

- `crypto.randomUUID()` (for node ID generation)
- SVG `foreignObject` (for inline text editing)
- CSS custom properties (for theming)

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
