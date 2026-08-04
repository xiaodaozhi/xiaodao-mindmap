<template>
  <div class="app-root" :class="`app-theme-${currentTheme}`">
    <header class="app-header">
      <h1>Xiaodao MindMap</h1>
      <div class="app-controls">
        <label>
          <input type="checkbox" :checked="currentTheme === 'dark'" @change="toggleTheme" />
          Dark Mode
        </label>
        <label>
          <input type="checkbox" :checked="currentLocale === 'en-US'" @change="toggleLocale" />
          English
        </label>
      </div>
    </header>
    <main class="app-main">
      <MindMap
        v-model="mindMapData"
        :theme="currentTheme"
        :locale="currentLocale"
      />
    </main>
    <aside class="app-debug">
      <pre>{{ JSON.stringify(mindMapData, null, 2) }}</pre>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MindMap from './components/mindmap/MindMap.vue'
import type { MindMapNode } from './components/mindmap/types'

const currentTheme = ref<'light' | 'dark'>('light')
const currentLocale = ref<string>('zh-CN')

const mindMapData = ref<MindMapNode>({
  id: 'root',
  text: '中心主题',
  children: [
    {
      id: 'c1',
      text: '分支 1',
      children: [
        { id: 'c1a', text: '子节点 1.1', children: [] },
        { id: 'c1b', text: '子节点 1.2', children: [] },
      ],
    },
    {
      id: 'c2',
      text: '分支 2',
      children: [
        { id: 'c2a', text: '子节点 2.1', children: [] },
      ],
    },
    {
      id: 'c3',
      text: '分支 3',
      children: [],
    },
  ],
})

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
}

function toggleLocale() {
  currentLocale.value = currentLocale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
}
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f0f0;
  color: #333;
  transition: background 0.3s, color 0.3s;
}

.app-root.app-theme-dark {
  background: #121212;
  color: #ccc;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

.app-theme-dark .app-header {
  background: #252525;
  border-color: #444;
}

.app-header h1 {
  margin: 0;
  font-size: 18px;
}

.app-controls {
  display: flex;
  gap: 16px;
}

.app-controls label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 13px;
}

.app-main {
  flex: 1;
  overflow: hidden;
}

.app-debug {
  flex-shrink: 0;
  max-height: 200px;
  overflow: auto;
  padding: 8px;
  background: #fafafa;
  border-top: 1px solid #ddd;
  font-size: 11px;
}

.app-theme-dark .app-debug {
  background: #1a1a1a;
  border-color: #444;
}
</style>
