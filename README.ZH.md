# 小刀思维导图 (Xiaodao MindMap)

**中文** | [English](./README.md) | [Demo](https://mindmap.xdz.me)

[![Downloads](https://img.shields.io/npm/d18m/xiaodao-mindmap)](https://www.npmjs.com/package/xiaodao-mindmap)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.4+-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg)](https://vitejs.dev/)

一个功能丰富、可交互的思维导图组件，基于 **Vue 3** 开发，使用 **TypeScript** 编写，并由 **Vite** 打包。在 SVG 画布上渲染层级化的思维导图，支持就地编辑、拖拽重组、撤销/重做、剪切/复制/粘贴、折叠/展开、缩放与平移、完整的键盘操作、亮色/暗色主题以及国际化。所有纯逻辑都放在小型、单一职责的组合式函数中，使视图层保持轻量、代码易于阅读与扩展。

![预览](img/preview.png)

---

## 功能特性

### 核心

- **SVG 画布编辑**：直接在 SVG 画布上点击、双击、平移和重组节点。
- **v-model 双向绑定**：通过双向绑定让思维导图数据与你的应用状态保持同步。
- **拖拽重组**：将任意节点拖到另一个节点上，即可将其作为子节点重新挂接；拖动时会有实时的放置指示线与"幽灵"预览提示落点。
- **缩放与平移**：工具栏缩放按钮、以光标为锚点的滚轮缩放、在空白画布上拖拽平移，以及在触摸设备上的双指捏合缩放。
- **折叠与展开**：任何拥有子节点的节点右侧都带有内联的 `+` / `−` 切换按钮。
- **撤销与重做**：工具栏按钮与键盘快捷键，背后是上限 50 步的历史栈。
- **剪切、复制与粘贴**：组件内部的剪贴板，用于在画布内移动或复制子树。
- **就地文本编辑**：双击任意节点（或在新建节点上按 Enter）即可通过 SVG `foreignObject` 输入框就地修改文本。
- **可设定尺寸容器**：通过 `width` / `height` 属性控制画布大小（默认撑满父容器）。

### 布局与渲染

- **树形布局算法**：自动的从左到右树形布局，采用基于"轮廓 (contour)"的重叠避让算法（见 [布局算法](#布局算法)）。
- **贝塞尔曲线**：父子节点之间使用平滑的三次贝塞尔曲线连接。
- **按层级样式**：根节点、二级节点、更深层节点拥有各自独立的视觉样式。

### 交互

- **键盘快捷键**：Tab、Enter、Delete、方向键，以及标准的 Ctrl/Cmd 组合键（见 [键盘快捷键](#键盘快捷键)）。
- **鼠标操作**：单击选中、双击编辑、空白画布拖拽平移、将节点拖到另一节点上重新挂接。
- **触摸操作**：轻点选中、单指平移、双指捏合缩放、单指拖动重新挂接。
- **工具栏**：画布右上角固定一个纵向工具栏，共 8 个按钮（撤销、重做、放大、缩小、重置视图、添加子节点、编辑、删除）。

### 视觉

- **亮色与暗色主题**：通过 `theme` 属性切换；所有颜色均由 CSS 变量驱动。
- **国际化 (i18n)**：内置中文 (`zh-CN`，默认) 与英文 (`en-US`) 翻译，通过 `locale` 属性切换。

---

## 安装

```bash
# npm（主要方式，本仓库附带 package-lock.json）
npm install xiaodao-mindmap

# pnpm / yarn 同样可用
pnpm add xiaodao-mindmap
yarn add xiaodao-mindmap
```

### 对等依赖

- `vue` ^3.4.0

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/xiaodaozhi/xiaodao-mindmap.git
cd xiaodao-mindmap

# 安装依赖
npm install

# 启动开发服务器（带主题 / 语言切换的演示应用）
npm run dev
```

启动后访问 `http://localhost:5173` 即可查看演示应用。

---

## 基础示例

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
  text: '中心主题',
  children: [
    {
      id: 'c1',
      text: '分支 1',
      children: [
        { id: 'c1a', text: '叶子 1.1', children: [] },
        { id: 'c1b', text: '叶子 1.2', children: [] },
      ],
    },
    {
      id: 'c2',
      text: '分支 2',
      children: [],
    },
  ],
})
</script>
```

若直接从源码仓库引入：

```ts
import MindMap from './components/mindmap/MindMap.vue'
import type { MindMapNode } from './components/mindmap/types'
```

---

## 属性 (Props)

| 属性 | 类型 | 默认值 | 说明 |
|------|------|---------|-------------|
| `modelValue` | `MindMapNode` | *必填* | 思维导图数据树的根节点（通过 `v-model` 绑定）。 |
| `theme` | `'light' \| 'dark'` | `'light'` | 颜色主题。会切换包装元素上的 `mindmap-theme-*` 类。 |
| `locale` | `string` | `'zh-CN'` | UI 语言键。内置 `'zh-CN'` 与 `'en-US'`。未知键回退到 `'en-US'`。 |
| `width` | `string \| number` | *(100%)* | 包装宽度。传入 `number` 视为像素；传入 `string` 原样使用（如 `'50vw'`、`'600px'`）。 |
| `height` | `string \| number` | *(100%)* | 包装高度。规则同 `width`。 |

---

## 事件 (Events)

| 事件 | 载荷 | 说明 |
|------|------|------|
| `update:modelValue` | `MindMapNode` | 每次数据变更后触发（携带新树的深拷贝）：包括编辑、新增、删除、移动、折叠切换、撤销/重做以及粘贴。 |

---

## 数据模型

### `MindMapNode`

`v-model` 双向绑定所使用的对外数据格式：

```typescript
interface MindMapNode {
  id: string            // 唯一标识 (crypto.randomUUID())
  text: string          // 显示文本
  children: MindMapNode[]  // 子节点（空数组即为叶子节点）
  collapsed?: boolean   // 为 true 时隐藏其子节点
}
```

- 根节点即整棵树；`children` 可任意层级嵌套。
- 粘贴节点时会重新生成其所有 `id`，以避免 key 冲突。

### 类型导出

```typescript
import type {
  MindMapNode,     // v-model 交换的对外契约
  LayoutNode,      // 内部增强形态（几何 + 深度），不对外暴露
  Connection,      // 一条贝塞尔连线端点对 { from, to }
  ClipboardData,   // { node, isCut }
} from 'xiaodao-mindmap'
```

---

## 架构

```
xiaodao-mindmap/
├── index.html                          # 演示入口 HTML（设置页面 <title>）
├── package.json                        # 依赖、脚本、包元数据
├── vite.config.ts                      # 库构建配置
├── vite.demo.config.ts                 # 演示（应用）构建配置 -> dist-demo/
├── tsconfig.json                       # TypeScript 配置（应用 / 类型检查）
├── tsconfig.node.json                  # 面向 Vite 配置文件的 TypeScript 配置
├── tsconfig.build.json                 # 用于产出 .d.ts 的 TypeScript 配置
├── dist/                               # 库构建输出（git 忽略，会发布）
├── dist-demo/                          # 演示构建输出（git 忽略）
├── src/
│   ├── main.ts                         # 演示引导文件
│   ├── App.vue                         # 带主题 / 语言切换的演示应用
│   ├── style.css                       # 全局重置样式（演示）
│   ├── env.d.ts                        # Vite / Vue 类型声明
│   ├── index.ts                        # 库入口：导出 MindMap 与类型
│   └── components/
│       └── mindmap/
│           ├── MindMap.vue             # 主组件（模板 + 逻辑 + 样式）
│           ├── style.css               # 组件级重置样式
│           ├── types/
│           │   └── index.ts            # TypeScript 类型定义
│           ├── i18n/
│           │   ├── zh-CN.ts            # 中文翻译（默认）
│           │   └── en-US.ts            # 英文翻译
│           └── composables/
│               ├── useI18n.ts          # 国际化组合式函数
│               ├── useUndoRedo.ts      # 撤销 / 重做栈管理
│               ├── useClipboard.ts     # 剪切 / 复制 / 粘贴内部剪贴板
│               ├── useKeyboard.ts      # 全局键盘快捷键处理
│               ├── useLayout.ts        # 树形布局算法
│               └── utils.ts            # 公共工具（deepClone、generateId）
└── img/
    └── preview.png                     # README 预览图
```

### 设计原则

- **唯一可变副本**：`innerRoot`（`modelValue` 的深拷贝）是唯一可变副本；`props.modelValue` 被视为不可变输入。
- **单向数据流**：`modelValue` -> `innerRoot`（深拷贝，响应式）-> `useLayout` 计算属性 -> SVG 渲染。每次变更都通过 `update:modelValue` 把深拷贝 emit 出去。
- **轻量视图层加组合式函数**：所有纯逻辑都放在 `composables/` 下单一职责的小型组合式函数中；`MindMap.vue` 只负责视图状态与 SVG/DOM 交互。
- **基于轮廓的布局**：布局算法在**每一个**深度层级避免"表亲"子树重叠，而不仅是最直接子节点。
- **CSS 变量主题**：每种颜色都是一个 `--mm-*` 自定义属性，使用者无需改动组件代码即可换肤。
- **SVG `viewBox` 缩放**：缩放与平移完全以 `viewBox` 表达，保证任意缩放下命中测试都正确。

完整的设计（数据流、基于轮廓的布局算法、撤销/重做、剪贴板、键盘、拖拽重组机制、缩放/平移与主题）详见 **[DOC.ZH.md](./DOC.ZH.md)**（英文版见 **[DOC.md](./DOC.md)**）。

---

## 布局算法

树采用基于轮廓的算法进行从左到右布局（`composables/useLayout.ts`）：

1. **度量**：递归计算每个子树的相对 `y`、`totalHeight`，以及一个**轮廓**（`Map<depth, {min, max}>`）描述其在每一深度层级占据的垂直跨度。单个子节点直接放在父节点右侧（无垂直偏移）；多个子节点先自上而下堆叠，再整体相对父节点垂直居中。
2. **展平**：通过累加父节点偏移得到每个节点的绝对 `x`/`y`，计算父节点上的连接锚点，并为每个非根节点产出一条 `Connection`。

关键常量：`NODE_WIDTH = 120`、`NODE_HEIGHT = 36`、`H_GAP = 80`、`V_GAP = 20`、`STEP_X = 200`。由于轮廓按深度追踪，即便隔了几层，表亲节点也不会相撞。完整算法见 **[DOC.ZH.md](./DOC.ZH.md)**。

---

## 拖拽重组（重新挂接）

将任意节点拖到另一个节点上即可重新挂接（`MindMap.vue` + 组合式函数）：

- 指针需移动超过 **4px** 拖拽才开始，因此单纯的轻点只会选中节点。
- 拖拽开始时，`pushState()` 拍下移动前快照（整次移动算一步撤销），节点被**移除**以便兄弟节点实时重排，并有幽灵跟随光标。
- **放置指示**（虚线占位框）精确显示节点将落下的位置。目标是被拖节点自身或其后代时会被拒绝。
- 取消或无操作时，节点被还原原位，并丢弃该快照（`popUndo()`），因此不会产生多余的历史项。

完整机制见 **[DOC.ZH.md](./DOC.ZH.md)**。

---

## 键盘快捷键

### 导航

| 按键 | 操作 |
|------|------|
| `↑` / `↓` | 选中上一个 / 下一个兄弟 |
| `←` | 选中父节点 |
| `→` | 选中第一个子节点 |

### 编辑

| 按键 | 操作 |
|------|------|
| `Tab` | 为选中节点添加子节点并进入编辑模式 |
| `Enter` | 为选中节点添加兄弟节点并进入编辑模式 |
| `Delete` / `Backspace` | 删除选中的非根节点 |
| `双击` | 就地编辑节点文本 |
| `Enter`（新建节点上） | 提交新建节点的文本 |
| `Escape` | 取消编辑 / 取消选中 |

### 剪贴板与历史

| 按键 | 操作 |
|------|------|
| `Ctrl + Z` / `Cmd + Z` | 撤销 |
| `Ctrl + Y` / `Ctrl + Shift + Z` / `Cmd + Shift + Z` | 重做 |
| `Ctrl + X` / `Cmd + X` | 剪切节点 |
| `Ctrl + C` / `Cmd + C` | 复制节点 |
| `Ctrl + V` / `Cmd + V` | 粘贴节点 |

> **注意：**
> - 粘贴只接受从本思维导图画布内复制或剪切的内容，系统剪贴板中的文本会被忽略。
> - 在就地编辑输入框内输入时，快捷键不生效（除 `Escape` 外）。

---

## 工具栏

画布右上角固定一个纵向工具栏：

| 按钮 | 可用性 | 说明 |
|------|--------|------|
| 撤销 | 始终（无可撤销时禁用） | 撤销上一步操作 |
| 重做 | 始终（无可重做时禁用） | 重做被撤销的操作 |
| 放大 | 达到最大缩放时禁用 | 放大，以画布中心为锚点 |
| 缩小 | 达到最小缩放时禁用 | 缩小，以画布中心为锚点 |
| 重置视图 | 始终 | 将缩放重置为 100% 并重新居中根节点 |
| 添加子节点 | 仅当选中节点时 | 为选中节点添加子节点并进入编辑模式 |
| 编辑 | 仅当选中节点时 | 进入选中节点的就地编辑模式 |
| 删除 | 仅当选中非根节点时 | 删除选中节点 |

缩放档位（百分比）：`10, 25, 33, 50, 75, 100, 150, 200, 300, 500, 700, 1000`（默认 `100%`）。

---

## 鼠标操作

| 操作 | 方式 |
|------|------|
| 选中节点 | 单击节点 |
| 编辑节点文本 | 双击节点 |
| 取消选中 | 点击空白画布区域 |
| 平移画布 | 在空白画布区域拖拽 |
| 切换折叠 | 点击节点右侧的 `+` / `−` 按钮 |
| 重新挂接节点 | 将节点拖到另一个节点上（或拖入其子节点区域），松开即作为其子节点放下 |

---

## 触摸操作

| 操作 | 方式 |
|------|------|
| 选中 | 轻点节点 |
| 平移 | 单指在空白画布拖拽 |
| 捏合缩放 | 双指张开 / 捏合 |
| 重新挂接 | 单指将节点拖到另一个节点上 |

---

## 主题定制

所有颜色都是包装元素上 `.mindmap-theme-light` 与 `.mindmap-theme-dark` 类作用域内的 CSS 自定义属性。你可以从自己的样式表中覆盖其中任意变量来重新定制外观，而无需改动组件代码：

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
  /* 完整变量列表见 MindMap.vue */
}
```

### 自定义主题

通过 `theme` 属性切换主题，或包裹组件并覆盖 CSS 变量实现完全定制：

```vue
<template>
  <div style="--mm-bg: #1a1a2e; --mm-node-text: #e0e0e0;">
    <MindMap v-model="data" theme="dark" />
  </div>
</template>
```

---

## 国际化

翻译文件位于 `src/components/mindmap/i18n/{zh-CN,en-US}.ts`，为扁平的 键到字符串 映射。`useI18n` 组合式函数会解析当前语言（未知键回退到 `en-US`）并暴露 `t(key)`。

要新增语言，在 `i18n/` 下新建文件，在 `useI18n.ts` 的 `locales` 中注册，并通过 `locale` 属性传入键名即可。现有键包含 `toolbar.*`（undo、redo、addChild、edit、delete、resetView、zoomIn、zoomOut）与 `node.*`（addChild、addSibling、delete、edit、copy、cut、paste、defaultText）。

---

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（支持热模块替换）
npm run dev

# 仅做类型检查
npm run typecheck
```

开发服务器默认运行在 `http://localhost:5173`。

---

## 构建

```bash
# 生产构建（类型检查 + vite build）
npm run build

# 将独立演示页面构建到 dist-demo/
npm run build:demo

# 预览生产构建
npm run preview
```

### 构建产物

| 文件 | 说明 |
|------|------|
| `dist/xiaodao-mindmap.js` | ES 模块（供打包工具使用） |
| `dist/xiaodao-mindmap.umd.cjs` | UMD 包（供直接 `<script>` 引入） |
| `dist/style.css` | 提取出的样式表 |
| `dist/index.d.ts` | TypeScript 类型声明入口 |

### CI/CD

项目包含一个 GitHub Actions 工作流（`.github/workflows/publish.yml`），在发布时构建并将库发布到 npm。

---

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） | ^3.4 |
| 构建 | Vite | ^5.4 |
| 语言 | TypeScript（strict） | ^5.4 |
| 渲染 | SVG（DOM + `<path>` 贝塞尔） | - |
| 类型检查 | vue-tsc | ^2.0 |
| 包管理器 | npm | - |
| CSS | 作用域 CSS + CSS 自定义属性 | - |

---

## 路线图

### 近期

- [x] SVG 画布编辑（点击、双击、平移、重组）
- [x] v-model 双向绑定
- [x] 拖拽重组（含实时放置指示与幽灵预览）
- [x] 缩放与平移（滚轮、工具栏、捏合）
- [x] 折叠与展开
- [x] 撤销与重做（50 步）
- [x] 剪切、复制与粘贴（内部剪贴板）
- [x] 就地文本编辑（SVG `foreignObject`）
- [x] 亮色与暗色主题
- [x] 国际化（zh-CN / en-US）
- [x] 贝塞尔连线 + 基于轮廓的布局

### 中期

- [ ] 多根节点 / 森林支持
- [ ] 自上而下与从右到左的布局方向
- [ ] 节点图标、图片与徽标
- [ ] 搜索与快速跳转
- [ ] 大图迷你地图
- [ ] 导出为 PNG / SVG / JSON
- [ ] 协同编辑

### 长期

- [ ] 自定义节点渲染器的插件系统
- [ ] 持久化适配器（离线优先）
- [ ] 移动端优化工具栏

---

## 浏览器兼容性

需要支持以下特性的现代浏览器：

- `crypto.randomUUID()`（用于生成节点 ID）
- SVG `foreignObject`（用于就地文本编辑）
- CSS 自定义属性（用于主题）

---

## 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](LICENSE) 文件。
