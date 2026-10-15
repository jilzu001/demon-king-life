# v4.2 — Yearly life in one sentence, with replay variety

- Based on complete v4.1 cumulative archive; retained existing story, endings and art.
- New active `content/annual_life_records_v4_2.json`: 65 age slots, **5 original single-sentence alternatives each (325 total)**.
- Short non-choice diary beats, never force a player decision every year.
- Legacy v4.1 65 choice-driven annual events and 12 generic-pool records preserved ONLY for migration/audit, not active registration.
- Deterministic, saved pick on arrival + per-age cross-run usage ledger; no same-record reroll on refresh/re-render; cycle five variants before repeat when possible.
- v4.1 event choice-memory hooks are historical only; do not automatically fire on passive records.
- Actual engine integration and end-to-end gameplay tests must be done in Codex.
