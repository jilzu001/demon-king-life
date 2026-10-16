import generated from '../content/generated/ending-tree.json';
import type { GameState, HistoryEntry } from '../engine/types';
export type TreeNode = {
  id: string; type: 'origin' | 'scene' | 'step' | 'ending'; parentId: string | null; depth: number; routeIds: string[];
  nodeId?: string; age?: number; sceneTitle?: string; choiceId?: string; choiceText?: string; outcomeId?: string; endingId?: string;
};
export const tree = generated as { nodes: TreeNode[]; edges: { from: string; to: string; legacyVersion?: string }[]; routes: Record<string, string[]> };
export const byTreeId = new Map(tree.nodes.map(node => [node.id, node]));
export const nodeWidth = 236, nodeHeight = 84;
export function layoutTree() {
  const layers: TreeNode[][] = [];
  for (const node of tree.nodes) (layers[node.depth] ??= []).push(node);
  // 고정된 층별 배치. 합류선의 교차를 줄이되 입력/카메라 조작으로 재배치하지 않는다.
  const order = new Map<string, number>();
  layers.forEach(layer => layer.forEach((node, index) => order.set(node.id, index)));
  for (let pass = 0; pass < 4; pass++) {
    const forward = pass % 2 === 0;
    for (const layer of forward ? layers.slice(1) : layers.slice(0, -1).reverse()) {
      const score = (node: TreeNode) => {
        const neighbors = tree.edges.filter(edge => forward ? edge.to === node.id : edge.from === node.id).map(edge => order.get(forward ? edge.from : edge.to)!);
        return neighbors.length ? neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length : order.get(node.id)!;
      };
      const scores = new Map(layer.map(node => [node.id, score(node)]));
      layer.sort((a, b) => scores.get(a.id)! - scores.get(b.id)!);
      layer.forEach((node, index) => order.set(node.id, index));
    }
  }
  const height = Math.max(...layers.map(layer => layer.length)) * 108;
  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, depth) => layer.forEach((node, index) => positions.set(node.id, { x: depth * 282, y: (height - layer.length * 108) / 2 + index * 108 })));
  return { positions, bounds: { x: -24, y: -24, width: (layers.length - 1) * 282 + nodeWidth + 48, height: height + 24 } };
}
export function stepsTo(node: TreeNode): TreeNode[] {
  const route = node.type === 'ending' ? tree.routes[node.endingId!] : Object.values(tree.routes).find(route => route.includes(node.id));
  return (route ?? []).map(id => byTreeId.get(id)!).filter(item => item.type === 'step');
}
const same = (node: TreeNode, entry: HistoryEntry) => node.nodeId === entry.nodeId && node.choiceId === entry.choiceId && node.outcomeId === entry.outcomeId;
export function visitStatus(node: TreeNode, state?: GameState | null) {
  if (!state) return { selected: false, resumable: false };
  if (node.type === 'origin') return { selected: true, resumable: false };
  if (node.type === 'scene') return { selected: state.enteredNodeIds.includes(node.nodeId!), resumable: state.enteredNodeIds.includes(node.nodeId!) };
  if (node.type === 'ending') return { selected: state.ended && state.endingId === node.endingId, resumable: false };
  return { selected: state.history.some(entry => same(node, entry)), resumable: state.enteredNodeIds.includes(node.nodeId!) };
}
export function lastVisitedFork(endingId: string, state?: GameState | null) {
  return (tree.routes[endingId] ?? []).map(id => byTreeId.get(id)!).filter(node => node.type === 'step' && visitStatus(node, state).resumable).at(-1);
}
export const historyTreeIds = (state: GameState) => ['origin', ...state.history.flatMap(entry => [`scene:${entry.nodeId}`, `step:${entry.nodeId}:${entry.choiceId}:${entry.outcomeId}`]), ...(state.endingId ? [`ending:${state.endingId}`] : state.currentNodeId ? [`scene:${state.currentNodeId}`] : [])];
export const edgeKey = (from: string, to: string) => `${from}→${to}`;
export const routeEdges = (ids: readonly string[]) => ids.slice(1).map((to, index) => edgeKey(ids[index]!, to));
export function collectedRoutes(discovered: ReadonlySet<string>, past: readonly GameState[] = []) {
  return [...discovered].flatMap(id => {
    const actual = past.find(run => run.endingId === id);
    return actual ? [historyTreeIds(actual)] : tree.routes[id] ? [tree.routes[id]!] : [];
  });
}
export function collectedRouteNodes(discovered: ReadonlySet<string>, past: readonly GameState[] = []) {
  return new Set(collectedRoutes(discovered, past).flat());
}
export function resumeSource(node: TreeNode, current?: GameState | null, past: readonly GameState[] = []) {
  if (current && visitStatus(node, current).resumable) return current;
  return past.find(run => visitStatus(node, run).resumable);
}
