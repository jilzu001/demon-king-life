import generated from '../content/generated/ending-tree.json';
import type { GameState, HistoryEntry } from '../engine/types';

export type TreeNode = {
  id: string; type: 'origin' | 'step' | 'ending'; parentId: string | null; depth: number; routeIds: string[];
  nodeId?: string; age?: number; sceneTitle?: string; choiceId?: string; choiceText?: string; outcomeId?: string; endingId?: string;
};
export const tree = generated as { nodes: TreeNode[]; edges: { from: string; to: string }[]; routes: Record<string, string[]> };
export const byTreeId = new Map(tree.nodes.map(node => [node.id, node]));
export const nodeWidth = 236, nodeHeight = 84;
export function layoutTree() {
  const positions = new Map<string, { x: number; y: number }>(); let leaf = 0;
  const visit = (id: string): number => {
    const node = byTreeId.get(id)!;
    const children = tree.nodes.filter(n => n.parentId === id);
    const ys = children.map(child => visit(child.id));
    const y = ys.length ? (ys[0]! + ys.at(-1)!) / 2 : leaf++ * 108;
    positions.set(id, { x: node.depth * 282, y }); return y;
  };
  visit('origin');
  return { positions, bounds: { x: -24, y: -24, width: Math.max(...[...positions.values()].map(p => p.x)) + nodeWidth + 48, height: Math.max(...[...positions.values()].map(p => p.y)) + nodeHeight + 48 } };
}
export function stepsTo(node: TreeNode): TreeNode[] {
  const path: TreeNode[] = []; let current: TreeNode | undefined = node;
  while (current) { if (current.type === 'step') path.unshift(current); current = current.parentId ? byTreeId.get(current.parentId) : undefined; }
  return path;
}
const same = (node: TreeNode, entry?: HistoryEntry) => Boolean(entry && node.nodeId === entry.nodeId && node.choiceId === entry.choiceId && node.outcomeId === entry.outcomeId);
export function visitStatus(node: TreeNode, state?: GameState | null) {
  if (!state) return { selected: false, resumable: false };
  if (node.type === 'origin') return { selected: true, resumable: false };
  const steps = stepsTo(node);
  const matches = steps.every((step, index) => same(step, state.history[index]));
  if (node.type === 'ending') return { selected: matches && state.endingId === node.endingId, resumable: false };
  const previous = steps.slice(0, -1);
  const resumable = previous.every((step, index) => same(step, state.history[index])) && state.enteredNodeIds.includes(node.nodeId!)
    && (state.history[previous.length]?.nodeId === node.nodeId || (!state.ended && state.currentNodeId === node.nodeId));
  return { selected: matches, resumable };
}
export function lastVisitedFork(endingId: string, state?: GameState | null) {
  return (tree.routes[endingId] ?? []).map(id => byTreeId.get(id)!).filter(node => node.type === 'step' && visitStatus(node, state).resumable).at(-1);
}
