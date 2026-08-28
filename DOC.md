# xiaodao-mindmap: Design Document

[中文](./DOC.ZH.md) | **English**

A Vue 3 mind map component built with SVG rendering. It supports interactive node editing, tree layout computed from a contour algorithm, drag-and-drop reparenting, zoom and pan anchored at the cursor, undo/redo (50 steps), an internal clipboard, keyboard navigation, light/dark theming via CSS variables, and English/Chinese localization. The component is distributed as a library but ships a standalone demo application built through a separate Vite config.

---

## 1. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Vue 3 (Composition API + `<script setup>`) | ^3.4 |
| Build | Vite | ^5.0 |
| Language | TypeScript (strict) | ~5.4 |
| Rendering | SVG (viewBox-based) | - |
| Type Checker | vue-tsc | ^2.2 |
| Package Manager | npm | - |

---

## 2. File Structure

```
xiaodao-mindmap/
├── index.html                  # Demo entry HTML
├── package.json
├── tsconfig.json               # strict mode
├── tsconfig.build.json         # declaration emit config
├── vite.config.ts              # library build (@vitejs/plugin-vue)
├── vite.demo.config.ts         # demo app build -> dist-demo/
└── src/
    ├── main.ts                 # createApp(App).mount('#app')
    ├── index.ts                # library entry: re-exports from components/mindmap/
    ├── App.vue                 # demo application root
    ├── style.css               # demo page global styles
    └── components/
        └── mindmap/
            ├── index.ts                # barrel export: component + types
            ├── MindMap.vue             # main component: SVG render + all interaction
            ├── style.css               # component styles (CSS variables)
            ├── types/
            │   └── index.ts            # all type definitions
            ├── i18n/
            │   ├── zh-CN.ts            # Simplified Chinese strings
            │   └── en-US.ts            # English strings
            └── composables/
                ├── utils.ts            # pure helpers (id, geometry, deep clone)
                ├── useI18n.ts          # locale lookup with fallback
                ├── useLayout.ts        # contour-based tree layout
                ├── useUndoRedo.ts      # snapshot stack (50 steps)
                ├── useClipboard.ts     # internal clipboard (copy/cut/paste)
                └── useKeyboard.ts      # global keyboard guard + handlers
```

**Dependency Direction**: `App.vue / consumer -> components/mindmap/index.ts -> MindMap.vue -> composables/* + types + i18n`.

Note: the component is a single-file `MindMap.vue` that composes all logic via the `composables/` modules. There is no separate Canvas or DOM render layer; rendering is declarative SVG driven by a computed layout.

---

## 3. Type System

All public types live in `components/mindmap/types/index.ts`.

```typescript
// A single node in the mind map tree.
export interface MindMapNode {
  id: string;
  text: string;
  collapsed?: boolean;          // when true, children are hidden
  children?: MindMapNode[];
}

// The external data format used for v-model two-way binding.
export interface MindMapModel {
  root: MindMapNode;
}

// Theme and locale aliases.
export type ThemeMode = 'light' | 'dark';
export type Locale = 'zh-CN' | 'en-US';

// Internal layout result: each node gets absolute coordinates.
export interface LaidOutNode {
  node: MindMapNode;
  x: number;
  y: number;
  depth: number;
  parentId: string | null;
  hasChildren: boolean;
}

export interface LayoutResult {
  nodes: LaidOutNode[];
  width: number;   // content bounds
  height: number;
}
```

The external contract is intentionally small: consumers only deal with `MindMapModel` (a `root` node with nested `children`). All layout coordinates, collapsed propagation, and selection state are internal.

---

## 4. Data Model

### 4.1 Core State

`MindMap.vue` keeps an internal working copy so the incoming `modelValue` is never mutated directly.

| State | Type | Description |
|---|---|---|
| `innerRoot` | `ref<MindMapNode>` | Deep clone of `props.modelValue.root`; the single source of truth inside the component |
| `selectedId` | `ref<string \| null>` | Currently selected node id |
| `editingId` | `ref<string \| null>` | Node currently in inline edit mode |
| `editText` | `ref<string>` | Live text of the inline editor |
| `collapsedSet` | `ref<Set<string>>` | Ids of collapsed nodes (derived from `node.collapsed`) |
| `viewBox` | `ref<{ x, y, w, h }>` | SVG viewBox controlling zoom + pan |
| `draggingId` | `ref<string \| null>` | Node being dragged for reparenting |
| `dropTargetId` | `ref<string \| null>` | Node currently hovered as a drop target |

### 4.2 Computed Properties

| Property | Description |
|---|---|
| `layout` | `useLayout(innerRoot, collapsedSet)` returns the positioned node list; recomputed only when structure or collapse state changes |
| `visibleNodes` | Nodes that pass the collapse filter (collapsed nodes hide their descendants) |
| `edges` | Parent -> child connector paths derived from `layout` |
| `themeColors` | Resolved CSS variable set based on `theme` prop |
| `scale` | Derived from `viewBox.w` relative to the container width |

### 4.3 v-model Data Sync

Incoming: `watch(props.modelValue)` deep-clones into `innerRoot` (guarded so internal edits do not echo back and cause loops).

Outgoing: mutations call a `commit()` helper that deep-clones `innerRoot` into a `MindMapModel` and `emit('update:modelValue', model)`, plus `emit('change', model)` for convenience.

---

## 5. Layout Constants & Coordinate System

### 5.1 Constants

Defined in `composables/useLayout.ts`:

```
NODE_WIDTH    = 180   (default node box width)
NODE_HEIGHT   = 44    (default node box height)
H_GAP         = 80    (horizontal gap between depth levels)
V_GAP         = 24    (vertical gap between sibling nodes)
ROOT_OFFSET_X = 80    (left padding before root)
ROOT_OFFSET_Y = 40    (top padding before first node)
```

Values are illustrative; the authoritative constants live in `useLayout.ts`. Node boxes use `overflow: hidden` text with ellipsis when text exceeds `NODE_WIDTH`.

### 5.2 Contour-Based Layout

The tree is laid out with a **contour (boundary) algorithm** rather than the naive Reingold-Tilford approach:

1. Recurse depth-first. Each subtree returns its lowest contour (the y of its bottom-most drawn node) and its height.
2. Siblings are stacked top-to-bottom with `V_GAP` between them, but their vertical start is pushed down so contours never overlap across subtrees.
3. A parent is centered vertically against the bounding box of its visible children.
4. `x` is assigned purely by `depth * (NODE_WIDTH + H_GAP) + ROOT_OFFSET_X`.

This guarantees no two nodes overlap even with uneven subtree heights, and keeps the root visually centered against its children.

### 5.3 Coordinate System

Rendering uses SVG `viewBox` instead of manual pixel math:

```
viewBox = { x, y, w, h }
  x, y   -> top-left world coordinate currently shown
  w, h   -> world units visible (smaller w = more zoomed in)
```

Node coordinates from `useLayout` are world coordinates. Zoom changes `w`/`h`; pan changes `x`/`y`. All pointer events are converted from screen space to world space via `screenToWorld(clientX, clientY)` using the SVG's `getScreenCTM().inverse()`.

---

## 6. Rendering Pipeline

### 6.1 Reactive Rendering

There is no manual `scheduleRender()` / `requestAnimationFrame` loop. Rendering is **declarative**: the template binds `layout.nodes` and `edges` to SVG `<g>` elements. Vue's reactivity re-renders only the changed DOM nodes. This keeps the code simple for a typical mind map size (hundreds of nodes).

### 6.2 SVG Structure

```
<svg :viewBox="...">
  <g class="edges">     <!-- connector paths -->
    <path v-for="e in edges" ... />
  </g>
  <g class="nodes">     <!-- node boxes -->
    <g v-for="n in visibleNodes"
       :transform="`translate(${n.x},${n.y})`">
      <rect /> <text />
    </g>
  </g>
  <g class="overlay">   <!-- drop indicators, ghost preview -->
  </g>
</svg>
```

### 6.3 Zoom & Pan (viewBox)

- **Wheel**: computes the world point under the cursor, scales `w`/`h` by a factor, then shifts `x`/`y` so the cursor's world point stays fixed (zoom anchored at cursor).
- **Toolbar buttons**: step through discrete scale levels (e.g. 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5) centered on the viewport middle.
- **Reset**: restores `viewBox` to fit the full content bounds.
- **Touch pinch**: two-finger distance delta maps to a scale factor around the gesture midpoint.

Clamping keeps `w`/`h` within sane bounds (min/max scale) and prevents panning the content completely out of view.

---

## 7. Interaction Model

### 7.1 Mouse

| Operation | Behavior |
|---|---|
| Click node | Select node |
| Click empty canvas | Deselect |
| Double-click node | Enter inline edit |
| Drag node onto another node | Reparent: dragged node becomes a child of the target |
| Drag node onto empty space | Reposition (no reparent) |
| Wheel | Zoom anchored at cursor |
| Drag empty canvas (or middle button) | Pan |

### 7.2 Keyboard

| Key | Behavior |
|---|---|
| `Tab` | Add child to selected node |
| `Enter` | Add sibling after selected node |
| `F2` / double-click | Edit selected node text |
| `Delete` / `Backspace` | Delete selected node (and its subtree) |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Y` or `Ctrl/Cmd+Shift+Z` | Redo |
| `Ctrl/Cmd+C` | Copy selected subtree to internal clipboard |
| `Ctrl/Cmd+X` | Cut |
| `Ctrl/Cmd+V` | Paste as child of selected node |
| `Arrow keys` | Move selection among siblings / to parent / to first child |
| `Esc` | Cancel edit / cancel drag |

### 7.3 Edit Mode

- Triggered by double-click, `F2`, or starting to type while a node is selected.
- An inline `<input>` (or contenteditable) overlays the node box; `editText` holds the live value.
- `Enter` commits and (by default) adds a sibling; `Esc` cancels; blur commits.
- Commit calls `commit()` which updates `innerRoot`, pushes an undo snapshot, and emits `update:modelValue`.

### 7.4 Touch

- Single tap selects; double tap edits.
- One-finger drag on a node initiates reparenting; one-finger drag on empty space pans.
- Two-finger pinch zooms; two-finger drag pans.
- Touch hit-testing reuses the same `screenToWorld` conversion as mouse.

### 7.5 Toolbar

The floating toolbar shows 8 buttons, with the last three conditionally enabled based on selection:

1. Undo (`useUndoRedo`)
2. Redo
3. Zoom in
4. Zoom out
5. Reset view
6. Add child (enabled when a node is selected)
7. Edit node (enabled when a node is selected)
8. Delete node (enabled when a node is selected)

---

## 8. Clipboard Protocol

An **internal clipboard** (`useClipboard.ts`) holds a deep-cloned subtree:

- **Copy** (`Ctrl+C`): clones the selected node and its descendants into `clipboard` (a plain object, not the system clipboard, to avoid cross-app side effects).
- **Cut** (`Ctrl+X`): copy then delete the source.
- **Paste** (`Ctrl+V`): clones the clipboard subtree, assigns fresh ids to every node (via `utils.genId`), and appends it as a child of the selected node. Pasting with nothing selected appends to root.
- **Move vs Copy semantics**: drag-reparenting moves the original node; clipboard paste always creates a copy with new ids, so the source remains intact.

Because ids are regenerated on paste, duplicated subtrees never collide in `selectedId`/`collapsedSet` lookups.

---

## 9. Theme System

### 9.1 CSS Variable Injection

`MindMap.vue` binds a `:style` object of CSS custom properties on the root element:

```css
--mm-bg, --mm-node-bg, --mm-node-border, --mm-node-text,
--mm-selected-bg, --mm-selected-border, --mm-edge,
--mm-toolbar-bg, --mm-toolbar-border, --mm-toolbar-text,
--mm-font-family
```

`style.css` consumes these variables, so the whole component re-themes by swapping the variable set. Both `light` and `dark` palettes are predefined in the component.

### 9.2 Custom Theme

Consumers can override any `--mm-*` variable from outside:

```vue
<template>
  <div style="--mm-node-bg: #1a1a2e; --mm-node-text: #e0e0e0;">
    <MindMap v-model="data" theme="dark" />
  </div>
</template>
```

---

## 10. Responsive Adaptation

- `width` / `height` props accept `number` (px) or `string` (e.g. `'100%'`). When a string or omitted, the SVG uses `width: 100%; height: 100%` and a `ResizeObserver` keeps the `viewBox` aspect ratio matched to the container.
- Fixed pixel sizes skip the observer and render at the given dimensions.
- The toolbar repositions itself to stay within the component bounds on resize.

---

## 11. Undo / Redo

Implemented in `useUndoRedo.ts`:

- **Snapshot**: before each structural mutation (add/delete/edit/reparent/paste/collapse), a deep clone of `innerRoot` is pushed onto `undoStack`.
- **Limit**: `UNDO_MAX = 50`; when exceeded, the oldest snapshot is dropped.
- **Undo**: pops `undoStack` -> restores `innerRoot` -> pushes onto `redoStack`.
- **Redo**: symmetric.
- **Collapse toggles** are also captured so undo restores the previous expand/collapse state.
- Inline text edits are coalesced: typing within the same node edit session produces a single undo entry on commit, not one per keystroke.

---

## 12. Extension Points / Roadmap

### Near-term
- [x] Inline node editing
- [x] Add child / sibling / delete
- [x] Drag-and-drop reparenting
- [x] Zoom & pan (cursor-anchored)
- [x] Undo / redo (50 steps)
- [x] Internal clipboard (copy/cut/paste)
- [x] Light / dark theme
- [x] English / Chinese i18n
- [ ] Collapse / expand animations
- [ ] Multi-select (box + shift)

### Mid-term
- [ ] Node colors / icons / badges per node
- [ ] Rich text or Markdown in nodes
- [ ] Import / export (JSON, FreeMind, Markdown outline)
- [ ] Mini-map for large maps
- [ ] Keyboard-first navigation enhancements (jump to text)

### Long-term
- [ ] Collaborative editing (CRDT)
- [ ] Canvas fallback for very large trees (virtualization)
- [ ] Plugin hooks for custom node renderers
- [ ] Export to PNG / SVG file

---

## 13. Development Notes

1. **Single source of truth**: `innerRoot` is the only mutable tree; props are cloned in, emissions are cloned out. This avoids accidental two-way binding loops.
2. **Declarative SVG over Canvas**: chosen for simplicity and accessibility; for maps beyond a few thousand nodes, a Canvas/virtualized path would be the next step.
3. **Layout is memoized**: `useLayout` returns a `computed`, so dragging a node does not relayout the whole tree unless structure changes; pure pan/zoom only mutates `viewBox`.
4. **Id regeneration on paste**: guarantees no id collisions after copy/paste of subtrees.
5. **i18n fallback**: unknown locale keys fall back to `en-US`; missing `en-US` keys fall back to the key itself, so the UI never breaks.
6. **TypeScript strict**: all composable signatures are typed; `vue-tsc` runs before the library build.
7. **Dual build**: `vite.config.ts` builds the library (`dist/`, with `types/`), while `vite.demo.config.ts` builds the standalone demo into `dist-demo/` (git-ignored, same as `dist/`).
8. **Cursor-anchored zoom**: implemented by converting the pointer to world space, scaling the viewBox, then re-converting to keep that world point under the cursor.

---

## 14. Feature Deep Dives

### 14.1 Layout Algorithm (Contour)

`useLayout(root, collapsedSet)`:

1. Walk the tree depth-first, skipping children of collapsed nodes.
2. For each node compute its subtree's vertical extent using a running "contour" array that tracks the lowest used y at each depth column.
3. Place siblings sequentially; if a new subtree would overlap an already-placed one, push it down past the contour.
4. Assign `x = depth * (NODE_WIDTH + H_GAP) + ROOT_OFFSET_X`.
5. Center each parent against the bounding box of its visible children.
6. Return `nodes` (with absolute x/y) plus overall `width`/`height` for viewBox fitting.

Because the algorithm tracks the actual bottom contour per depth, subtrees of very different sizes never visually collide.

### 14.2 Drag and Drop (Reparenting)

- On `pointerdown` on a node, `draggingId` is set and a threshold (a few px) must be exceeded before a drag starts, so a click is not misread as a drag.
- During drag, `screenToWorld` positions a **ghost preview** of the node; the nearest node under the cursor (excluding the dragged node and its own descendants) becomes `dropTargetId`, drawn with a **placement indicator line** and a highlighted border.
- On `pointerup`:
  - If a valid `dropTargetId` exists and is not the dragged node's ancestor/descendant -> remove the node from its old parent and append to the target's `children`.
  - Otherwise -> no structural change (snap back).
- Every successful reparent pushes one undo snapshot and emits `update:modelValue`.
- Dropping onto empty canvas does not reparent (keeps the node where it was) unless an explicit reposition feature is enabled.

### 14.3 Zoom & Pan (viewBox)

- The entire camera is the SVG `viewBox`. Zoom = scale `w`/`h`; pan = shift `x`/`y`.
- Wheel handler:
  1. `worldBefore = screenToWorld(cursor)`.
  2. `factor = deltaY < 0 ? 1.1 : 1/1.1`.
  3. `w *= 1/factor; h *= 1/factor` (clamped to min/max scale).
  4. `worldAfter = screenToWorld(cursor)` with new viewBox; `x += worldBefore.x - worldAfter.x; y += worldBefore.y - worldAfter.y`.
- This keeps the point under the cursor fixed, matching native map-zoom feel.

### 14.4 Internationalization

- `i18n/zh-CN.ts` and `i18n/en-US.ts` export flat dictionaries keyed by the same ids (toolbar labels, edit placeholder, confirm messages).
- `useI18n(locale)` returns a `t(key)` function: looks up `locale` first, falls back to `en-US`, then to the key string.
- The `locale` prop defaults to `'zh-CN'`; switching it reactively updates all visible strings without remount.
- Adding a language means adding one file and registering it in `useI18n`'s lookup map.
