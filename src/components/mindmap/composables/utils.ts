import type { MindMapNode } from '../types'

export function deepClone<T extends MindMapNode>(node: T): T {
  return JSON.parse(JSON.stringify(node))
}

export function generateId(): string {
  return crypto.randomUUID()
}