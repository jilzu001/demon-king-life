/* Reference algorithm; Codex should adapt it to the current runtime and save shape. */
export function selectAnnualVariant({ age, variants, runId, runSelections, history, shuffle }) {
  if (!Array.isArray(variants) || !variants.length) throw Error('missing annual variants for age '+age);
  const key = String(age);
  if (runSelections[key]) {
    const existing = variants.find(v => v.id === runSelections[key]);
    if (!existing) throw Error('saved annual variant not found: '+runSelections[key]);
    return existing; // Never reroll when a saved scene is re-rendered.
  }
  const ids = variants.map(v => v.id);
  const entries = (history[key] || []).filter(id => ids.includes(id));
  const counts = Object.fromEntries(ids.map(id => [id, entries.filter(x => x === id).length]));
  const leastUsed = Math.min(...Object.values(counts));
  let eligible = ids.filter(id => counts[id] === leastUsed);
  const last = entries.at(-1);
  if (eligible.length > 1 && eligible.includes(last)) eligible = eligible.filter(id => id !== last);
  // `shuffle` must be a seeded, reproducible RNG from the actual runtime, never Math.random() per render.
  const id = shuffle(eligible, {age, runId})[0];
  runSelections[key] = id;
  // Commit `runSelections` + `history` once, atomically on first entering age, not per render.
  history[key] = [...entries, id];
  return variants.find(v => v.id === id);
}
