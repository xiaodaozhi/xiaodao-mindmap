# xiaodao-mindmap 设计文档

**中文** | [English](./DOC.md)

一个基于 SVG 渲染的 Vue 3 思维导图组件。支持节点交互编辑、基于轮廓（contour）算法的树形布局、拖拽重组（改变父子关系）、以光标为锚点的缩放与平移、撤销/重做（50 步）、内部剪贴板、键盘导航、通过 CSS 变量实现的明暗主题，以及中英文国际化。组件以库形式发布，同时提供独立的演示应用（通过单独的 Vite 配置构建）。

---

## 1. 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 框架 | Vue 3（Composition API + `<script setup>`） | ^3.4 |
| 构建 | Vite | ^5.0 |
| 语言 | TypeScript（strict） | ~5.4 |
| 渲染 | SVG（基于 viewBox） | - |
| 类型检查 | vue-tsc | ^2.2 |
| 包管理器 | npm | - |

---

## 2. 文件结构

```
xiaodao-mindmap/
├── index.html                  # 演示入口 HTML
├── package.json
├── tsconfig.json               # strict 模式
├── tsconfig.build.json         # 声明文件 emit 配置
├── vite.config.ts              # 库构建（@vitejs/plugin-vue）
├── vite.demo.config.ts         # 演示应用构建 -> dist-demo/
└── src/
    ├── main.ts                 # createApp(App).mount('#app')
    ├── index.ts                # 库入口：从 components/mindmap/ 统一导出
    ├── App.vue                 # 演示应用根组件
    ├── style.css               # 演示页全局样式
    └── components/
        └── mindmap/
            ├── index.ts                # 统一导出：组件 + 类型
            ├── MindMap.vue             # 主组件：SVG 渲染 + 全部交互逻辑
            ├── style.css               # 组件样式（CSS 变量）
            ├── types/
            │   └── index.ts            # 全部类型定义
            ├── i18n/
            │   ├── zh-CN.ts            # 简体中文文案
            │   └── en-US.ts            # 英文文案
            └── composables/
                ├── utils.ts            # 纯工具函数（id、几何、深拷贝）
                ├── useI18n.ts          # 国际化查找（带回退）
                ├── useLayout.ts        # 基于轮廓的树形布局
                ├── useUndoRedo.ts      # 快照栈（50 步）
                ├── useClipboard.ts     # 内部剪贴板（复制/剪切/粘贴）
                └── useKeyboard.ts      # 全局键盘守卫 + 处理
```

**依赖方向**：`App.vue / 使用者 -> components/mindmap/index.ts -> MindMap.vue -> composables/* + types + i18n`。

说明：组件是单文件 `MindMap.vue`，通过 `composables/` 模块组合全部逻辑。没有独立的 Canvas 或 DOM 渲染层；渲染是声明式的 SVG，由 computed 布局驱动。

---

## 3. 类型系统

所有公开类型位于 `components/mindmap/types/index.ts`。

```typescript
// 思维导图树中的单个节点
export interface MindMapNode {
  id: string;
  text: string;
  collapsed?: boolean;          // 为 true 时隐藏其子节点
  children?: MindMapNode[];
}

// 用于 v-model 双向绑定的外部数据格式
export interface MindMapModel {
  root: MindMapNode;
}

// 主题与语言别名
export type ThemeMode = 'light' | 'dark';
export type Locale = 'zh-CN' | 'en-US';

// 内部布局结果：每个节点获得绝对坐标
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
  width: number;   // 内容边界
  height: number;
}
```

对外契约刻意保持精简：使用者只需处理 `MindMapModel`（一个带嵌套 `children` 的 `root` 节点）。所有布局坐标、折叠传播、选中状态都是内部实现。

---

## 4. 数据模型

### 4.1 核心状态

`MindMap.vue` 维护一份内部工作副本，从而绝不原地修改传入的 `modelValue`。

| 状态 | 类型 | 说明 |
|---|---|---|
| `innerRoot` | `ref<MindMapNode>` | `props.modelValue.root` 的深拷贝；组件内的唯一数据源 |
| `selectedId` | `ref<string \| null>` | 当前选中节点 id |
| `editingId` | `ref<string \| null>` | 当前处于行内编辑模式的节点 |
| `editText` | `ref<string>` | 行内编辑器的实时文本 |
| `collapsedSet` | `ref<Set<string>>` | 已折叠节点 id 集合（由 `node.collapsed` 推导） |
| `viewBox` | `ref<{ x, y, w, h }>` | 控制缩放与平移的 SVG viewBox |
| `draggingId` | `ref<string \| null>` | 正在被拖拽以重组的节点 |
| `dropTargetId` | `ref<string \| null>` | 当前悬停作为放置目标的节点 |

### 4.2 计算属性

| 属性 | 说明 |
|---|---|
| `layout` | `useLayout(innerRoot, collapsedSet)` 返回已定位的节点列表；仅在结构或折叠状态变化时重算 |
| `visibleNodes` | 通过折叠过滤的节点（折叠节点隐藏其后代） |
| `edges` | 由 `layout` 推导出的父 -> 子连接路径 |
| `themeColors` | 依据 `theme` prop 解析出的 CSS 变量集合 |
| `scale` | 由 `viewBox.w` 相对容器宽度推导出的缩放比例 |

### 4.3 v-model 数据同步

入向：`watch(props.modelValue)` 将 `modelValue` 深拷贝进 `innerRoot`（带守卫，避免内部编辑回灌造成循环）。

出向：变更调用 `commit()` 助手，将 `innerRoot` 深拷贝为 `MindMapModel` 并 `emit('update:modelValue', model)`，同时为方便起见 `emit('change', model)`。

---

## 5. 布局常量与坐标系

### 5.1 常量

定义于 `composables/useLayout.ts`：

```
NODE_WIDTH    = 180   （默认节点框宽度）
NODE_HEIGHT   = 44    （默认节点框高度）
H_GAP         = 80    （层级间的水平间距）
V_GAP         = 24    （兄弟节点间的垂直间距）
ROOT_OFFSET_X = 80    （根节点左侧留白）
ROOT_OFFSET_Y = 40    （首个节点顶部留白）
```

以上为示意值；权威常量以 `useLayout.ts` 为准。节点框在文本超出 `NODE_WIDTH` 时使用省略号截断。

### 5.2 基于轮廓的布局

树采用**轮廓（contour）算法**而非朴素的 Reingold-Tilford 方案：

1. 深度优先递归。每个子树返回其最低轮廓（最底部已绘制节点的 y）及其高度。
2. 兄弟节点自上而下堆叠，间隔 `V_GAP`，但其垂直起点会被下推，确保轮廓在子树之间不重叠。
3. 父节点相对其可见子节点的包围盒做垂直居中。
4. `x` 仅由 `depth * (NODE_WIDTH + H_GAP) + ROOT_OFFSET_X` 决定。

这保证了即便子树高度悬殊，任意两个节点也不会重叠，且根节点相对其子节点保持视觉居中。

### 5.3 坐标系

渲染使用 SVG `viewBox`，而非手写像素换算：

```
viewBox = { x, y, w, h }
  x, y   -> 当前显示的视口左上角世界坐标
  w, h   -> 可见的世界单位（w 越小表示放大越多）
```

`useLayout` 给出的节点坐标是世界坐标。缩放改变 `w`/`h`；平移改变 `x`/`y`。所有指针事件通过 SVG 的 `getScreenCTM().inverse()` 由屏幕空间转换为世界空间（`screenToWorld(clientX, clientY)`）。

---

## 6. 渲染管线

### 6.1 响应式渲染

没有手动的 `scheduleRender()` / `requestAnimationFrame` 循环。渲染是**声明式**的：模板将 `layout.nodes` 与 `edges` 绑定到 SVG 的 `<g>` 元素。Vue 的响应式只重渲染发生变化的 DOM 节点。对于典型规模的思维导图（数百节点），这足以保持简洁与高效。

### 6.2 SVG 结构

```
<svg :viewBox="...">
  <g class="edges">     <!-- 连接线 -->
    <path v-for="e in edges" ... />
  </g>
  <g class="nodes">     <!-- 节点框 -->
    <g v-for="n in visibleNodes"
       :transform="`translate(${n.x},${n.y})`">
      <rect /> <text />
    </g>
  </g>
  <g class="overlay">   <!-- 放置指示线、幽灵预览 -->
  </g>
</svg>
```

### 6.3 缩放与平移（viewBox）

- **滚轮**：先求光标下的世界坐标点，按系数缩放 `w`/`h`，再平移 `x`/`y` 使光标的世界坐标点保持不动（以光标为锚点缩放）。
- **工具栏按钮**：在离散缩放档位间切换（如 0.5、0.75、1、1.25、1.5、2、2.5），以视口中心为缩放中心。
- **重置**：将 `viewBox` 恢复为完整适配内容边界。
- **触摸捏合**：双指距离变化映射为以手势中点为中心的缩放系数。

缩放会对 `w`/`h` 做钳制（最小/最大缩放），并防止内容被完全移出视口。

---

## 7. 交互模型

### 7.1 鼠标

| 操作 | 行为 |
|---|---|
| 点击节点 | 选中节点 |
| 点击空白画布 | 取消选中 |
| 双击节点 | 进入行内编辑 |
| 拖拽节点到另一节点 | 重组：被拖节点成为目标的子节点 |
| 拖拽节点到空白 | 重定位（不改变父子关系） |
| 滚轮 | 以光标为锚点缩放 |
| 拖拽空白画布（或中键） | 平移 |

### 7.2 键盘

| 按键 | 行为 |
|---|---|
| `Tab` | 为选中节点添加子节点 |
| `Enter` | 在选中节点后添加兄弟节点 |
| `F2` / 双击 | 编辑选中节点文本 |
| `Delete` / `Backspace` | 删除选中节点（及其子树） |
| `Ctrl/Cmd+Z` | 撤销 |
| `Ctrl/Cmd+Y` 或 `Ctrl/Cmd+Shift+Z` | 重做 |
| `Ctrl/Cmd+C` | 复制选中子树到内部剪贴板 |
| `Ctrl/Cmd+X` | 剪切 |
| `Ctrl/Cmd+V` | 粘贴为选中节点的子节点 |
| `方向键` | 在兄弟/父/首个子节点间移动选中 |
| `Esc` | 取消编辑 / 取消拖拽 |

### 7.3 编辑模式

- 由双击、`F2`、或在选中节点后直接输入触发。
- 一个行内 `<input>`（或 contenteditable）覆盖在节点框上；`editText` 保存实时值。
- `Enter` 提交并（默认）添加兄弟节点；`Esc` 取消；失焦提交。
- 提交调用 `commit()`，更新 `innerRoot`、压入撤销快照，并 `emit('update:modelValue')`。

### 7.4 触摸

- 单指点按选中；双指点按编辑。
- 单指在节点上拖拽发起重组；单指在空白拖拽平移。
- 双指捏合缩放；双指拖拽平移。
- 触摸命中检测复用与鼠标相同的 `screenToWorld` 转换。

### 7.5 工具栏

浮动工具栏显示 8 个按钮，后三个依据选中状态条件启用：

1. 撤销（`useUndoRedo`）
2. 重做
3. 放大
4. 缩小
5. 重置视图
6. 添加子节点（选中节点时启用）
7. 编辑节点（选中节点时启用）
8. 删除节点（选中节点时启用）

---

## 8. 剪贴板协议

**内部剪贴板**（`useClipboard.ts`）持有一个深拷贝的子树：

- **复制**（`Ctrl+C`）：将选中节点及其后代深拷贝进 `clipboard`（普通对象，非系统剪贴板，避免跨应用副作用）。
- **剪切**（`Ctrl+X`）：先复制再删除源。
- **粘贴**（`Ctrl+V`）：深拷贝剪贴板子树，为其中每个节点分配全新 id（`utils.genId`），并作为选中节点的子节点追加。未选中任何节点时，粘贴到根节点下。
- **移动 vs 复制语义**：拖拽重组移动原始节点；剪贴板粘贴始终创建带新 id 的副本，源保持不变。

由于粘贴时重新生成 id，复制出的子树在 `selectedId`/`collapsedSet` 查找中永不冲突。

---

## 9. 主题系统

### 9.1 CSS 变量注入

`MindMap.vue` 在根元素上绑定一个包含 CSS 自定义属性的 `:style` 对象：

```css
--mm-bg, --mm-node-bg, --mm-node-border, --mm-node-text,
--mm-selected-bg, --mm-selected-border, --mm-edge,
--mm-toolbar-bg, --mm-toolbar-border, --mm-toolbar-text,
--mm-font-family
```

`style.css` 消费这些变量，因此整个组件只需替换变量集合即可换肤。组件内已预定义 `light` 与 `dark` 两套调色板。

### 9.2 自定义主题

使用者可从外部覆盖任意 `--mm-*` 变量：

```vue
<template>
  <div style="--mm-node-bg: #1a1a2e; --mm-node-text: #e0e0e0;">
    <MindMap v-model="data" theme="dark" />
  </div>
</template>
```

---

## 10. 响应式适配

- `width` / `height` prop 接受 `number`（像素）或 `string`（如 `'100%'`）。当为字符串或省略时，SVG 使用 `width: 100%; height: 100%`，并由 `ResizeObserver` 使 `viewBox` 宽高比与容器保持一致。
- 固定像素尺寸会跳过 observer，按给定尺寸渲染。
- 工具栏会在尺寸变化时重新定位，保持在组件边界内。

---

## 11. 撤销 / 重做

由 `useUndoRedo.ts` 实现：

- **快照**：每次结构性变更前（增/删/编辑/重组/粘贴/折叠），将 `innerRoot` 的深拷贝压入 `undoStack`。
- **上限**：`UNDO_MAX = 50`；超出时丢弃最旧快照。
- **撤销**：`undoStack.pop()` -> 恢复 `innerRoot` -> 压入 `redoStack`。
- **重做**：对称操作。
- **折叠切换**同样被捕获，因此撤销会恢复先前的展开/折叠状态。
- 行内文本编辑被合并：同一节点编辑会话内的输入只产生一条撤销记录（提交时），而非每次按键一条。

---

## 12. 扩展点 / 路线图

### 近期
- [x] 行内节点编辑
- [x] 添加子节点 / 兄弟节点 / 删除
- [x] 拖拽重组（改变父子关系）
- [x] 缩放与平移（以光标为锚点）
- [x] 撤销 / 重做（50 步）
- [x] 内部剪贴板（复制/剪切/粘贴）
- [x] 明暗主题
- [x] 中英文国际化
- [ ] 折叠 / 展开动画
- [ ] 多选（框选 + Shift）

### 中期
- [ ] 节点级颜色 / 图标 / 徽标
- [ ] 节点内富文本或 Markdown
- [ ] 导入 / 导出（JSON、FreeMind、Markdown 大纲）
- [ ] 大图小地图（mini-map）
- [ ] 键盘优先导航增强（跳转到文本）

### 长期
- [ ] 协同编辑（CRDT）
- [ ] 超大树形结构的 Canvas 回退（虚拟化）
- [ ] 自定义节点渲染器的插件钩子
- [ ] 导出为 PNG / SVG 文件

---

## 13. 开发笔记

1. **唯一数据源**：`innerRoot` 是唯一可变的树；props 克隆入、emit 克隆出。这避免了意外的双向绑定循环。
2. **声明式 SVG 而非 Canvas**：为简洁与可访问性而选；对于超过数千节点的图，下一步应是 Canvas / 虚拟化方案。
3. **布局已记忆化**：`useLayout` 返回 `computed`，因此拖拽单个节点不会重排整棵树（除非结构变化）；纯平移/缩放只修改 `viewBox`。
4. **粘贴时重新生成 id**：保证复制子树后不会出现 id 冲突。
5. **i18n 回退**：未知语言键回退到 `en-US`；缺失的 `en-US` 键回退到键本身，因此 UI 永不崩溃。
6. **TypeScript strict**：所有 composable 签名都有类型；库构建前会运行 `vue-tsc`。
7. **双构建**：`vite.config.ts` 构建库（`dist/`，含 `types/`），而 `vite.demo.config.ts` 将独立演示构建到 `dist-demo/`（已被 git 忽略，与 `dist/` 同等对待）。
8. **以光标为锚点的缩放**：先转换指针到世界坐标，缩放 viewBox，再转换回来保持该世界坐标点落在光标下实现。

---

## 14. 特性深入

### 14.1 布局算法（轮廓法）

`useLayout(root, collapsedSet)`：

1. 深度优先遍历树，跳过折叠节点的子节点。
2. 为每个节点计算其子树的垂直范围，使用一条随深度列记录最低已用 y 的"轮廓"数组。
3. 顺序放置兄弟节点；若新子树会与已放置者重叠，则将其下推越过轮廓。
4. 分配 `x = depth * (NODE_WIDTH + H_GAP) + ROOT_OFFSET_X`。
5. 每个父节点相对其可见子节点包围盒做居中。
6. 返回 `nodes`（带绝对 x/y）以及用于 viewBox 适配的总体 `width`/`height`。

由于算法按深度追踪真实底部轮廓，尺寸差异很大的子树在视觉上永不碰撞。

### 14.2 拖拽重组（改变父子关系）

- `pointerdown` 在节点上时设置 `draggingId`，且必须先超过阈值（几像素）才真正进入拖拽，以免把点击误判为拖拽。
- 拖拽过程中，`screenToWorld` 定位节点的**幽灵预览**；光标下最近的节点（排除被拖节点及其后代）成为 `dropTargetId`，并以**放置指示线**和高亮边框呈现。
- `pointerup` 时：
  - 若存在有效 `dropTargetId` 且该节点不是被拖节点的祖先/后代 -> 从原父节点移除并追加为目标的 `children`。
  - 否则 -> 不改变结构（回弹）。
- 每次成功的重组会压入一条撤销快照并 `emit('update:modelValue')`。
- 拖到空白画布不会重组（保持节点原位置），除非启用了显式重定位特性。

### 14.3 缩放与平移（viewBox）

- 整个相机就是 SVG 的 `viewBox`。缩放 = 缩放 `w`/`h`；平移 = 平移 `x`/`y`。
- 滚轮处理：
  1. `worldBefore = screenToWorld(cursor)`。
  2. `factor = deltaY < 0 ? 1.1 : 1/1.1`。
  3. `w *= 1/factor; h *= 1/factor`（钳制到最小/最大缩放）。
  4. 用新 viewBox 求 `worldAfter = screenToWorld(cursor)`；`x += worldBefore.x - worldAfter.x; y += worldBefore.y - worldAfter.y`。
- 这保证了光标下的点保持不动，符合原生地图缩放手感。

### 14.4 国际化

- `i18n/zh-CN.ts` 与 `i18n/en-US.ts` 导出以相同 id 为键的扁平字典（工具栏标签、编辑占位符、确认文案）。
- `useI18n(locale)` 返回 `t(key)` 函数：先查 `locale`，回退到 `en-US`，再回退到键字符串。
- `locale` prop 默认为 `'zh-CN'`；切换时会响应式更新所有可见文案，无需重挂载。
- 新增语言只需添加一个文件并在 `useI18n` 的查找表中注册。
