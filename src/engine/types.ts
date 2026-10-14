export type Scalar = string | number | boolean;
export type Condition =
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'; path: string; value: Scalar }
  | { all: Condition[] } | { any: Condition[] } | { not: Condition };
export type Effect = { op: 'set' | 'add' | 'addToSet' | 'removeFromSet'; path: string; value: Scalar };
export type Destination = { kind: 'node' | 'ending'; id: string };
export type Outcome = { id: string; when?: Condition; weight: number; result: 'success' | 'failure' | 'mixed' | 'neutral'; to: Destination; effects?: Effect[] };
export type Choice = { id: string; text: string; description?: string; enabledWhen?: Condition; outcomes: Outcome[] };
export type Chronicle = { age: number; text: string; when?: Condition; presence?: string[]; reference?: string[]; flashback?: string[] };
export type Scene = { id: string; kind: 'scene'; age: number; title: string; body: string; chronicle?: Chronicle[]; entryEffects?: Effect[]; choices: Choice[] };
export type Character = { id: string; name: string; role: string; traits: string[] };
export type Ending = { id: string; kind: 'happy' | 'normal' | 'bad' | 'bittersweet' | 'hidden' | 'absurd'; title: string; body: string; recapRules?: { when: Condition; text: string }[] };
export type Player = { species: string; combat: number; magic: number; gold: number; alive: boolean; legalStatus: string; crimes: string[] };
export type Npc = { alive: boolean; combat: number; trust: number; affection: number; relationship: string };
export type WorldState = { age: number; player: Player; npcs: Record<string, Npc>; flags: string[]; inventory: Record<string, number> };
export type Manifest = { schemaVersion: 1; id: string; version: string; title: string; entryNodeId: string; chapters: string[]; charactersFile: string; endingsFile: string; initialState: WorldState };
export type HistoryEntry = { age: number; nodeId: string; choiceId: string; outcomeId: string; toKind: 'node' | 'ending'; toId: string };
export type GameState = WorldState & {
  saveSchemaVersion: 1; storyId: string; storyVersion: string; runId: string;
  currentNodeId: string | null; endingId: string | null; ended: boolean;
  rng: { seed: number; state: number }; history: HistoryEntry[]; enteredNodeIds: string[];
};
export type Story = { manifest: Manifest; nodes: Record<string, Scene>; characters: Record<string, Character>; endings: Record<string, Ending>; warnings: string[] };
export type TransitionReceipt = HistoryEntry & { id: string; result: Outcome['result'] };
export type Meta = { saveSchemaVersion: 1; discoveredEndings: Record<string, string[]> };

export class GameError extends Error {
  constructor(message: string) { super(message); this.name = 'GameError'; }
}
export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new GameError(message);
}
