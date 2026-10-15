# v4.2 annual-life writing policy & Codex integration

## What changed and why
- This is a **cumulative** archive based on v4.1. Core story nodes (16), 65 expansion events, endings and 56 illustrations are retained without deliberate replacement.
- The older 65 annual items and 12 pooled items required choices every year; the user explicitly rejected this. **v4.2 replaces that mode with one-sentence past-tense records without choices**.
- New authoritative file: `content/annual_life_records_v4_2.json` contains **65 years × 5 distinct, hand-written options = 325 records**.
- Display only ONE selected variant for a given age; no A/B buttons, no immediate result screen. Automatically progress to the next chronological year after the player has read the record, via existing normal next/proceed action (not a decision).
- Every new game chooses a different variant when available. Preserve a per-age usage ledger across runs (privacy-respecting local persistence where permitted) and rotate through five choices before repeating. Once five are exhausted, new cycle can repeat but avoid immediate duplicate. A save/resume/re-render must NEVER reshuffle an already selected record. Selected id must be in visited timeline and save.
- For paths with a genuine core/branch/conditional event at that age, show that event in preference to a filler. Same-age linked story nodes MUST be preserved.
- **Do not import/register both v4.1 annual events and v4.2 records** or the old 154 forced choices will reappear. Older annual files are kept only for regression/compatibility.

## Runtime migration
1. Read existing repo and make backups; detect existing annual implementation rather than overwriting the router.
2. Preserve v4.1 save state. If an old save currently sits on `annual_XX` with an unfinished choice, either let that exact existing event resolve or perform an explicit one-time migration with a test; never discard the old save silently.
3. For an older completed `annual_XX_a/b` flag, preserve existing flags and allow matching legacy callbacks only on genuinely visited historical choice events. New passive variants set no `a/b` flag. Do not render a v4.1 callback for a v4.2 passive record.
4. Ensure timeline history records exactly what was shown with age and variant id. One summary is the same one-sentence text, not a repeated full prose card.
5. NPC portraits should clear/neutral on these narration-only records. No mandatory art for short records; no image enlargement.
6. Do not force event records after death or after a finalized ending. Respect saved `pendingCoreTarget`, no age skipping, no age regression.
7. If persistent history is unavailable, fall back to a saved per-run seeded selector; do not falsely promise cross-device non-repetition. Do not collect personally identifying analytics.
8. Treat v4.1 annual generic pool as deprecated; use the five options per age for replay variability instead. Do not promise unique text indefinitely (finite stock).

## Acceptance tests
- Check 1..65 ages each have exactly five nonempty unique single-line strings, **zero choices and zero effects**.
- Game age advances sequentially; 0→12, 12→20, 21→29, 29→41, 47→60/62/65, plus earlier deaths and all ending paths.
- Run same age in five new runs with history persistence: five **distinct** variants. Sixth run may repeat an old one, but not necessarily last run's variant. With refresh within a run, exact same variant.
- Verify at least 100 save/resume/refresh simulations: no duplicate age filler, no lost age, no orphan callback, no unexpected choice button, no incorrect old annual flag.
- Early childhood uses age-appropriate language and actions; post-20 text does not contradict Mina's possible exam outcomes, romances or deaths; employment, marriage and royal status never assumed.
- At age with core content, the core event appears and filler is skipped. Core four-choice hero practical exam, especially '미나에게 사랑한다고 고백한다.' is protected.
- Report actual engine coverage separately from static data validation, with changed paths and unsatisfied tests.
