import type { MindMapNode } from '../types';
import { generateUuid } from '../utils/idGenerator';

export function deepClone<T extends MindMapNode>(node: T): T {
  return JSON.parse(JSON.stringify(node));
}

export function generateId(): string {
  return generateUuid();
}
