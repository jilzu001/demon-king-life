import type { GameState } from '../engine/types';
import type { StoragePort } from '../persistence/save';

export const annualLedgerKey = 'demon-king:annual-variants:v4.5';
type Year = { age: number; variants: { id: string; text: string }[] };
type Ledger = { version: 1; runs: Record<string, Record<string, string>>; used: Record<string, string[]> };
// 표시 원장은 게임 세이브/도감과 분리한다. 없거나 사용할 수 없으면 seed 기반으로 읽는다.
export function annualVariants(state: GameState, years: Year[], storage?: StoragePort) {
  const seedRows = years.map(year => ({ id: year.variants[(Math.imul(state.rng.seed ^ year.age, 2654435761) >>> 0) % year.variants.length]!.id, age: year.age }));
  let port = storage;
  try { if (!port && typeof window !== 'undefined') port = window.localStorage; } catch { return seedRows; }
  if (!port || !years.length) return seedRows;
  try {
    const raw = port.getItem(annualLedgerKey);
    const ledger: Ledger = raw === null ? { version: 1, runs: {}, used: {} } : JSON.parse(raw);
    if (!ledger || ledger.version !== 1 || typeof ledger.runs !== 'object' || !ledger.runs || Array.isArray(ledger.runs)
      || typeof ledger.used !== 'object' || !ledger.used || Array.isArray(ledger.used)) return seedRows;
    const key = `${state.storyId}:${state.storyVersion}:${state.runId}:${state.rng.seed}`;
    const existing = Object.hasOwn(ledger.runs, key) ? ledger.runs[key] : undefined;
    if (existing !== undefined && (!existing || typeof existing !== 'object' || Array.isArray(existing))) return seedRows;
    const run = existing ?? {}; let changed = false;
    const rows = years.map((year, index) => {
      const candidates = year.variants.map(v => v.id); let id = run[String(year.age)];
      if (!id || !candidates.includes(id)) {
        const saved = ledger.used[String(year.age)];
        let used = Array.isArray(saved) ? [...new Set(saved.filter(id => candidates.includes(id)))] : [];
        if (used.length === candidates.length) used = [];
        const start = candidates.indexOf(seedRows[index]!.id);
        id = Array.from({ length: candidates.length }, (_, offset) => candidates[(start + offset) % candidates.length]!).find(id => !used.includes(id))!;
        run[String(year.age)] = id; ledger.used[String(year.age)] = [...used, id]; changed = true;
      }
      return { id, age: year.age };
    });
    if (changed) { ledger.runs[key] = run; port.setItem(annualLedgerKey, JSON.stringify(ledger)); }
    return rows;
  } catch { return seedRows; }
}
