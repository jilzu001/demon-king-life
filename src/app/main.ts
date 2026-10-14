import { loadBrowserStory } from '../content/load';
import { MAX_JSON_BYTES, parseJson } from '../content/json';
import { evaluate } from '../engine/conditions';
import { choose, createRun } from '../engine/transition';
import { ensure, type GameState, type Meta, type TransitionReceipt } from '../engine/types';
import { SaveStore } from '../persistence/save';
import { backupBeforeImport, resolveCompatibleSave, BACKUP_KEY } from '../persistence/compatibility';
import type { PresentedStory } from '../content/presentation';
import { lifeEvents, confirmedChoice, resultLabels } from '../ui/history';
import { renderNarrative } from '../ui/narrative';
import { element, button, icon } from '../ui/dom';
import { ReadingSequence, type ReadingStep } from '../ui/reading';
import '../styles/main.css';

const root = document.querySelector<HTMLDivElement>('#app')!;
let story: PresentedStory | null = null;
let activeStory: PresentedStory | null = null;
let legacyStory: PresentedStory | null = null;
let store: SaveStore | null = null;
let state: GameState | null = null;
let meta: Meta = { saveSchemaVersion: 1, discoveredEndings: {} };
let pending: GameState | null = null;
let pendingReceipt: TransitionReceipt | null = null;
let pendingStory: PresentedStory | null = null;
let busy = false;
let errorText = '';
let compatibilityNotice = '';
let openMenu: 'history' | 'settings' | null = null;
let historyExpanded = new Set<string>();
const reading = new ReadingSequence();
function notify(error: unknown) {
  errorText = error instanceof Error ? error.message : String(error);
  openMenu = null;
  console.error(error); render();
}
function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = element('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportRun() {
  try {
    const raw = pending ? JSON.stringify(pending, null, 2) : state ? JSON.stringify(state, null, 2) : store?.raw();
    ensure(raw, '내보낼 회차 저장이 없습니다.');
    download(raw, 'demon-king-save.json');
  } catch (error) { notify(error); }
}
function makeStore(context: PresentedStory) {
  const known = new Set([...Object.keys(activeStory?.endings ?? context.endings), ...Object.keys(legacyStory?.endings ?? {})]);
  return new SaveStore(context, () => window.localStorage, known);
}
function commit(next: GameState, nextReceipt: TransitionReceipt | null = null, context = story) {
  ensure(context, '저장소가 준비되지 않았습니다.');
  pending = next;
  pendingReceipt = nextReceipt;
  pendingStory = context;
  const nextStore = makeStore(context);
  meta = nextStore.commit(next);
  story = context; store = nextStore; state = next;
  pending = null; pendingReceipt = null; pendingStory = null; errorText = '';
}
async function makeChoice(nodeId: string, choiceId: string) {
  if (busy || pending || !state || !story || root.querySelector('[data-reading="true"]')) return;
  busy = true;
  // 같은 렌더링에서 큐에 쌓인 두 번째 클릭도 원래 nodeId 검사를 통과하지 못한다.
  root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => { b.disabled = true; });
  try {
    const result = choose(story, state, nodeId, choiceId);
    commit(result.nextState, result.transitionReceipt);
  } catch (error) { notify(error); }
  finally {
    render(); // 저장된 다음 장면을 보여주되 연속 클릭이 끝날 때까지 입력을 잠근다.
    await new Promise(resolve => setTimeout(resolve, 400));
    busy = false;
    root.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach(b => { b.disabled = false; });
    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => { b.disabled = Boolean(pending) || b.dataset.enabled === 'false' || Boolean(root.querySelector('[data-reading="true"]')); });
    root.querySelectorAll<HTMLButtonElement>('[data-when-ready]').forEach(b => { b.disabled = Boolean(pending) && b.dataset.whenReady !== 'retry'; });
    const file = root.querySelector<HTMLInputElement>('#save-file'); if (file) file.disabled = Boolean(pending);
  }
}
function focusCurrentEvent() {
  const start = document.querySelector<HTMLElement>('#current-event');
  if (!start) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  start.focus({ preventScroll: true });
  if (start.getBoundingClientRect().top < 0 || start.getBoundingClientRect().top > innerHeight * .35) {
    start.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
  }
}
function newRun() {
  if (busy || !activeStory) return;
  busy = true;
  try {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    commit(createRun(activeStory, seed, crypto.randomUUID()), null, activeStory);
    compatibilityNotice = ''; openMenu = null; historyExpanded.clear();
  } catch (error) { notify(error); }
  finally { busy = false; render(); }
}

function render() {
  reading.detach();
  root.replaceChildren();
  const layout = element('main', undefined, 'game-shell'); root.append(layout);
  const header = element('header', undefined, 'game-header');
  const brand = element('div', undefined, 'brand');
  brand.append(element('p', '한 사람의 선택, 한 번의 일생', 'eyebrow'), element('h1', '가짜 마왕의 일생'));
  const menus = element('nav', undefined, 'header-actions'); menus.setAttribute('aria-label', '게임 메뉴');
  const historyButton = button('전체 기록', () => { if (busy) return; openMenu = 'history'; render(); }, busy); historyButton.prepend(icon('book')); historyButton.dataset.menu = 'true';
  const settingsButton = button('설정', () => { if (busy) return; openMenu = 'settings'; render(); }, busy); settingsButton.prepend(icon('settings')); settingsButton.dataset.menu = 'true';
  settingsButton.setAttribute('aria-label', '저장 관리 · 엔딩 도감'); menus.append(historyButton, settingsButton);
  header.append(brand, menus);
  if (state) {
    const stats = element('section', undefined, 'stats'); stats.setAttribute('aria-label', '현재 능력치');
    const age = element('span', `${state.age}세`, 'age-stat'); stats.append(age);
    for (const [label, value, type] of [['전투력', state.player.combat, 'sword'], ['마력', state.player.magic, null], ['금화', state.player.gold, 'coin']] as const) {
      const stat = element('span'); if (type) stat.append(icon(type)); stat.append(element('small', label), element('strong', value.toLocaleString('ko-KR'))); stats.append(stat);
    }
    header.append(stats);
  }
  layout.append(header);
  if (errorText) {
    const alert = element('section', undefined, 'error'); alert.setAttribute('role', 'alert');
    alert.append(element('p', errorText), element('p', '기존 회차를 확인하거나 JSON으로 백업하세요. 저장 성공 전에는 다음 장면을 표시하지 않습니다.'));
    alert.append(button('회차 JSON 내보내기', exportRun));
    if (pending) {
      const retry = button('저장 다시 시도', () => { try { commit(pending!, pendingReceipt, pendingStory); render(); } catch (error) { notify(error); } }, busy);
      retry.dataset.whenReady = 'retry'; alert.append(retry);
    }
    if (!story) alert.append(button('콘텐츠 다시 불러오기', boot));
    layout.append(alert);
  }
  if (!story) { if (!errorText) layout.append(element('p', '이야기를 불러오는 중입니다.')); return; }
  if (story.presentationWarning || compatibilityNotice) {
    const note = element('details', undefined, 'notice'); note.append(element('summary', '콘텐츠 및 저장 안내'), element('p', [compatibilityNotice, story.presentationWarning].filter(Boolean).join(' '))); layout.append(note);
  }
  if (state) {
    const columns = element('div', undefined, 'game-columns');
    const past = element('aside', undefined, 'life-column'); past.setAttribute('aria-label', '나의 인생');
    renderTimeline(past, story, state); renderPeople(past, story, state);
    const present = element('section', undefined, 'event-column');
    present.id = 'current-event'; present.tabIndex = -1; present.setAttribute('aria-label', '현재 사건');
    const last = state.history.at(-1);
    if (last) {
      const confirmed = confirmedChoice(story, last);
      const result = element('section', undefined, 'receipt'); result.setAttribute('role', 'status');
      result.append(element('p', `지난 선택 판정: ${resultLabels[confirmed.outcome.result]} · ${state.history.length}번째 선택`, 'receipt-label'), element('p', `${confirmed.choice.text} → ${confirmed.destination}`, 'receipt-text')); present.append(result);
    }
    if (state.ended) renderEnding(present, story, state); else renderScene(present, story, state);
    columns.append(past, present); layout.append(columns);
    bindReading(layout, columns, story, state);
  } else {
    layout.append(element('section', '검증된 저장을 불러오지 못했습니다. 기존 저장을 백업한 뒤 새 회차를 시작하거나 호환되는 JSON을 가져오세요.', 'panel'));
  }
  layout.append(element('footer', `선택은 행동의 시도입니다. · 콘텐츠 ${story.manifest.version} · ${pending ? '저장 미완료' : state ? '자동 저장 완료' : '저장 확인 필요'}`));
  if (openMenu) renderMenu(layout);
}
function bindReading(layout: HTMLElement, columns: HTMLElement, content: PresentedStory, current: GameState) {
  const steps: ReadingStep[] = [];
  const latest = new Set([current.currentNodeId, current.history.at(-1)?.nodeId]);
  for (const row of columns.querySelectorAll<HTMLElement>('.timeline-item')) {
    if (!current.history.length || latest.has(row.dataset.nodeId) || row.dataset.eventId?.startsWith('ending:')) {
      steps.push({ element: row, stage: 'chronicle' });
    }
  }
  // 본문 한 단락과 각 화자의 대사를 순서대로 표시한다. 전체 기록은 즉시 열람 가능하다.
  for (const line of columns.querySelectorAll<HTMLElement>('.story .narrative > .body, .story .dialogue-line, .story > .body')) {
    steps.push({ element: line, stage: 'scene' });
  }
  const controls = element('div', undefined, 'reading-controls');
  const status = element('span', undefined, 'reading-status'); status.setAttribute('aria-live', 'polite');
  const faster = button('빠르게 표시', () => {}); const skip = button('스킵', () => {});
  skip.setAttribute('aria-label', '스킵 · 바로 선택하기'); controls.append(status, faster, skip);
  layout.insertBefore(controls, columns);
  const gates = [...columns.querySelectorAll<HTMLElement>('.choice-prompt, .choices, .story > h3, .story > ol, .story > .subtle, .story > button')];
  const life = columns.querySelector<HTMLElement>('.life-panel')!; life.tabIndex = -1;
  reading.bind({
    key: `${content.manifest.version}:${current.runId}:${current.history.length}:${current.currentNodeId ?? current.endingId}`,
    steps, surface: columns, controls, status, faster, skip, gates, paused: Boolean(openMenu),
    canChoose: () => !busy && !pending,
    onReveal: (step, first) => {
      const offset = `${controls.getBoundingClientRect().height + 24}px`;
      life.style.scrollMarginTop = offset;
      columns.querySelector<HTMLElement>('#current-event')!.style.scrollMarginTop = offset;
      if (first && step.stage === 'chronicle') {
        life.focus({ preventScroll: true });
        if (matchMedia('(max-width: 760px)').matches) life.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      if (step.stage === 'chronicle') {
        const timeline = step.element.parentElement!;
        if (getComputedStyle(timeline).overflowY === 'auto') timeline.scrollTop = timeline.scrollHeight;
      } else if (first) focusCurrentEvent();
    },
    onSkip: () => {
      const target = columns.querySelector<HTMLElement>('[data-choice][data-enabled="true"]') ?? columns.querySelector<HTMLElement>('.story > button');
      if (target) {
        const focus = target instanceof HTMLButtonElement && target.disabled ? columns.querySelector<HTMLElement>('#scene-title')! : target;
        focus.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    },
  });
}
function renderSettings(save: HTMLElement) {
  if (!story) return;
  const tools = element('div', undefined, 'tools');
  const exportButton = button('회차 JSON 내보내기', exportRun, busy); exportButton.dataset.whenReady = 'normal'; tools.append(exportButton);
  const restart = button(state ? '새 회차 시작' : '기존 회차를 교체하고 시작', newRun, busy || Boolean(pending)); restart.dataset.whenReady = 'normal'; tools.append(restart);
  let backup: string | null = null; try { backup = window.localStorage.getItem(BACKUP_KEY); } catch { /* 저장 오류는 기존 오류 영역에서 안내한다. */ }
  if (backup) tools.append(button('업데이트 전 회차 JSON 내보내기', () => {
    try {
      const original = parseJson(backup!, '이전 저장 백업') as { run: string | null };
      ensure(typeof original.run === 'string', '이전 회차 백업이 없습니다.');
      download(original.run, 'demon-king-before-v1.1-save.json');
    } catch (error) { notify(error); }
  }));
  const fileLabel = element('label', '회차 JSON 가져오기'); fileLabel.htmlFor = 'save-file';
  const input = element('input'); input.id = 'save-file'; input.type = 'file'; input.accept = '.json,application/json'; input.disabled = busy || Boolean(pending);
  input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file || !activeStory || !legacyStory || busy || pending) return;
    busy = true;
    try {
      ensure(file.size <= MAX_JSON_BYTES, '파일 크기 제한(1MB)을 초과했습니다.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      const resolved = resolveCompatibleSave(activeStory, legacyStory, text);
      backupBeforeImport(window.localStorage);
      commit(resolved.state, null, resolved.story); compatibilityNotice = resolved.notice; openMenu = null;
    } catch (error) { notify(error); }
    finally { busy = false; render(); }
  });
  tools.append(fileLabel, input); save.append(tools);
  save.append(element('p', `${pending ? '자동 저장 미완료' : state ? '자동 저장 완료' : '저장 확인 필요'} · 현재 브라우저에 보관됩니다. JSON으로 기기 간 이동할 수 있습니다.`, 'subtle'));
  const discovered = new Set(meta.discoveredEndings[story.manifest.id] ?? []);
  const allEndings = { ...legacyStory?.endings, ...activeStory?.endings };
  const collection = element('ul');
  for (const ending of Object.values(activeStory?.endings ?? story.endings)) collection.append(element('li', discovered.has(ending.id) ? `발견 · ${ending.title}` : '미발견 엔딩'));
  for (const id of discovered) if (!activeStory?.endings[id] && allEndings[id]) collection.append(element('li', `이전 예제에서 발견 · ${allEndings[id]!.title}`));
  save.append(element('h3', '엔딩 도감'), element('p', `발견한 엔딩 ${[...discovered].filter(id => activeStory?.endings[id]).length} / ${Object.keys(activeStory?.endings ?? story.endings).length}`), collection);
}
function renderScene(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const node = content.nodes[current.currentNodeId!]!;
  const panel = element('section', undefined, 'panel story');
  const presentation = content.presentation?.nodes[node.id];
  panel.append(element('p', `${current.age}세 · 현재 사건`, 'eyebrow'));
  if (presentation?.locationLabel) panel.append(element('p', presentation.locationLabel, 'location'));
  const title = element('h2', node.title); title.id = 'scene-title'; title.tabIndex = -1;
  panel.append(title, renderNarrative(node.body, presentation), element('p', '어떻게 행동할까?', 'choice-prompt'));
  const choices = element('div', undefined, 'choices');
  for (const [index, choice] of node.choices.entries()) {
    const enabled = evaluate(content, current, choice.enabledWhen);
    const b = button('', () => makeChoice(node.id, choice.id), !enabled || busy || Boolean(pending));
    b.dataset.choice = choice.id; b.dataset.enabled = String(enabled); b.classList.add('choice-card');
    b.setAttribute('aria-label', choice.text);
    const text = element('span', undefined, 'choice-content');
    text.append(element('span', choice.text, 'choice-title'));
    if (choice.description) text.append(element('small', choice.description, 'choice-description'));
    if (!enabled) text.append(element('small', '현재 상태에서는 실행 조건을 충족하지 못했습니다.'));
    b.append(element('span', String.fromCharCode(65 + index), 'choice-letter'), text);
    choices.append(b);
  }
  panel.append(choices); layout.append(panel);
}
function renderEnding(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const ending = content.endings[current.endingId!]!;
  const panel = element('section', undefined, 'panel story');
  panel.append(element('p', `회차 종료 · ${current.age}세`, 'eyebrow'));
  const title = element('h2', ending.title); title.id = 'scene-title'; title.tabIndex = -1;
  panel.append(title, element('p', ending.body, 'body'));
  for (const rule of ending.recapRules ?? []) if (evaluate(content, current, rule.when)) panel.append(element('p', rule.text));
  const highlights = element('ol');
  for (const entry of current.history.slice(-5)) highlights.append(element('li', `${entry.age}세 · ${content.nodes[entry.nodeId]!.choices.find(c => c.id === entry.choiceId)!.text}`));
  panel.append(element('h3', '실제로 남긴 선택'), highlights, element('p', `발견 엔딩 ID: ${ending.id}`, 'subtle'));
  const restart = button('새 회차 시작', newRun, busy || Boolean(pending)); restart.dataset.whenReady = 'normal'; panel.append(restart); layout.append(panel);
}
function renderPeople(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const people = element('details', undefined, 'panel'); people.append(element('summary', '인물 관계 · 재산 · 법적 기록'));
  for (const [id, npc] of Object.entries(current.npcs)) people.append(element('p', `${content.characters[id]!.name} · ${npc.alive ? '생존' : '사망'} · 전투력 ${npc.combat.toLocaleString('ko-KR')} · 신뢰 ${npc.trust} · 호감 ${npc.affection} · 관계 ${npc.relationship}`));
  people.append(element('p', `법적 상태: ${current.player.legalStatus}`), element('p', `유죄 확정 전과: ${current.player.crimes.join(', ') || '없음'}`), element('p', `소지품: ${Object.entries(current.inventory).map(([id, n]) => `${id} ${n}`).join(', ') || '없음'}`));
  layout.append(people);
}
function renderTimeline(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const panel = element('section', undefined, 'panel life-panel');
  const top = element('div', undefined, 'panel-heading'); top.append(element('h2', '나의 인생'), element('span', `${current.history.length}번의 선택`, 'subtle')); panel.append(top);
  const all = lifeEvents(content, current);
  const list = element('ol', undefined, 'timeline'); list.setAttribute('aria-label', '실제 인생 연대기');
  for (const event of all.slice(-8)) {
    const item = element('li', undefined, 'timeline-item'); item.dataset.eventId = event.id;
    if (event.nodeId) item.dataset.nodeId = event.nodeId;
    if (current.history.length && !all.slice(-3).some(recent => recent.id === event.id)) item.dataset.mobilePast = 'true';
    item.append(element('span', `${event.age}세`, 'timeline-age'));
    const text = element('div'); text.append(element('p', event.summary, 'timeline-text'));
    if (event.result) text.append(element('span', resultLabels[event.result], 'timeline-result'));
    item.append(text); list.append(item);
  }
  panel.append(list);
  const open = button(`전체 인생 기록 · ${all.length}개`, () => { if (busy) return; openMenu = 'history'; render(); }, busy); open.dataset.menu = 'true'; open.classList.add('quiet-button'); panel.append(open); layout.append(panel);
}
function renderMenu(layout: HTMLElement) {
  const dialog = element('dialog', undefined, 'menu-dialog');
  const menuKind = openMenu;
  const title = element('h2', menuKind === 'history' ? '전체 인생 기록' : '저장 관리 · 엔딩 도감'); title.id = 'menu-title';
  dialog.setAttribute('aria-labelledby', title.id);
  const close = () => { openMenu = null; dialog.close(); render(); document.querySelector<HTMLButtonElement>(menuKind === 'history' ? '.header-actions button:first-child' : '.header-actions button:last-child')?.focus(); };
  const top = element('div', undefined, 'panel-heading'); top.append(title, button('닫기', close)); dialog.append(top);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  if (menuKind === 'settings') renderSettings(dialog);
  else if (story && state) {
    for (const event of lifeEvents(story, state)) {
      const row = element('details', undefined, 'history-entry'); row.dataset.eventId = event.id;
      row.append(element('summary', `${event.age}세 · ${event.kind === 'origin' ? event.summary : event.title}`));
      if (event.kind !== 'origin') row.append(element('p', event.summary));
      if (event.choiceText && event.result) row.append(element('p', `${event.choiceText} · ${resultLabels[event.result]} → ${event.destination}`, 'history-decision'));
      if (event.nodeId) {
        const node = story.nodes[event.nodeId]!;
        row.append(renderNarrative(node.body, story.presentation?.nodes[event.nodeId]));
      }
      row.open = historyExpanded.has(event.id);
      row.addEventListener('toggle', () => { if (row.open) historyExpanded.add(event.id); else historyExpanded.delete(event.id); });
      dialog.append(row);
    }
  }
  layout.append(dialog); dialog.showModal();
}
async function boot() {
  try {
    [activeStory, legacyStory] = await Promise.all([
      loadBrowserStory(import.meta.env.BASE_URL), loadBrowserStory(import.meta.env.BASE_URL, 'demon-king-legacy-phase1'),
    ]);
    story = activeStory; store = makeStore(story);
    backupBeforeImport(window.localStorage);
    meta = store.loadMeta();
    const raw = store.raw();
    if (raw) {
      const resolved = resolveCompatibleSave(activeStory, legacyStory, raw);
      compatibilityNotice = resolved.notice; commit(resolved.state, null, resolved.story);
    }
    else newRun();
  } catch (error) { notify(error); }
  finally { render(); }
}
// 브라우저 뒤로가기는 문서 이동만 한다. 게임 상태는 저장 원장으로만 복원한다.
window.addEventListener('pageshow', event => { if (event.persisted) { state = null; pending = null; void boot(); } });
void boot();
