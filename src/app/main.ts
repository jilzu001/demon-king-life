import { loadBrowserStory } from '../content/load';
import { MAX_JSON_BYTES, parseJson } from '../content/json';
import { evaluate } from '../engine/conditions';
import { choose, createRun } from '../engine/transition';
import { ensure, type GameState, type Meta, type TransitionReceipt } from '../engine/types';
import { SaveStore } from '../persistence/save';
import { backupBeforeImport, resolveCompatibleSave, backupKey } from '../persistence/compatibility';
import { backupBeforeCompactUpgrade } from '../persistence/compact-compatible';
import type { PresentedStory } from '../content/presentation';
import { lifeEvents, confirmedChoice, resultLabels } from '../ui/history';
import { renderNarrative } from '../ui/narrative';
import { element, button, icon } from '../ui/dom';
import { ReadingSequence, type ReadingStep } from '../ui/reading';
import { PageReader } from '../ui/pages';
import { illustrateNarrative, readingCompanions } from '../ui/illustrations';
import { portraitUrl, portraitCharacters, dialogueEmotion, type PortraitCharacter, type PortraitEmotion } from '../ui/portraits';
import { canonicalPortrait } from '../ui/visual-identity';
import '../styles/main.css';
import { isCompact, compactSlot } from '../content/compact-contract';
import { loadCompactProgress, compactProgressKey, type CompactProgress } from '../ui/compact-progress';
import { renderCompactEnding } from '../ui/compact-ending';
import { endingGalleryEntries, galleryEndingIds } from '../content/ending-gallery';
import { renderEndingGallery, renderEndingDetail } from '../ui/ending-gallery';
import { resumeAtVisitedNode, backupBeforeReselect, loadReselectBackup, RESELECT_BACKUP_KEY } from '../persistence/reselect';

const root = document.querySelector<HTMLDivElement>('#app')!;
// 원작 UI는 로컬 회귀 검사 모드에서만 유지한다. 공개 빌드는 모든 주소에서 최신 판이다.
const compactMode = import.meta.env.MODE !== 'archived-ui';
const titleKey = compactMode ? 'demon-king:title-seen:compact' : 'demon-king:title-seen';
let compactViewRun = '';
let compactViewData: CompactProgress | null = null;
function compactView(): CompactProgress {
  ensure(state, '회차가 없습니다.');
  if (!compactViewData || compactViewRun !== state.runId) { compactViewRun = state.runId; compactViewData = loadCompactProgress(state); }
  return compactViewData;
}
function updateCompactView(patch: Partial<CompactProgress>) {
  ensure(state, '회차가 없습니다.');
  compactViewData = { ...compactView(), ...patch };
  try { localStorage.setItem(compactProgressKey(state), JSON.stringify(compactViewData)); }
  catch { compatibilityNotice = '게임 진행은 저장됐지만 화면 표시 위치는 저장할 수 없습니다. 새로고침하면 마지막 서술을 다시 보여줍니다.'; }
}
const textSizeKey = 'demon-king:ui:text-percent';
let textPercent = 100;
try {
  const savedSize = Number(localStorage.getItem(textSizeKey));
  if ([100, 110, 120, 130, 140, 150].includes(savedSize)) textPercent = savedSize;
} catch { /* 화면 설정 저장이 불가능해도 기본 크기로 플레이한다. */ }
document.documentElement.style.setProperty('--text-scale', String(textPercent / 100));
const textBrightnessKey = 'demon-king:ui:text-brightness';
let textBrightness = 100;
try {
  const saved = localStorage.getItem(textBrightnessKey);
  const value = Number(saved);
  if (saved !== null && Number.isInteger(value) && value >= 0 && value <= 100 && value % 5 === 0) textBrightness = value;
} catch { /* 게임 저장과 별개인 화면 설정이다. */ }
document.documentElement.style.setProperty('--text-brightness', `${textBrightness}%`);
const readModeKey = 'demon-king:ui:reading-mode';
let readMode: 'scroll' | 'page' = 'scroll';
try { if (compactMode && localStorage.getItem(readModeKey) === 'page') readMode = 'page'; } catch { /* 기본 스크롤 방식으로 읽는다. */ }
let story: PresentedStory | null = null;
let activeStory: PresentedStory | null = null;
let legacyStory: PresentedStory | null = null;
let store: SaveStore | null = null;
let state: GameState | null = null;
let meta: Meta = { saveSchemaVersion: 1, discoveredEndings: {} };
let pending: GameState | null = null;
let pendingReceipt: TransitionReceipt | null = null;
let pendingStory: PresentedStory | null = null;
let pendingResumeRun = '';
let resumeChoiceRun = '';
let busy = false;
let errorText = '';
let compatibilityNotice = '';
let openMenu: 'history' | 'settings' | 'people' | null = null;
let endingDetailId: string | null = null;
let galleryReturnFocus: string | null = null;
let historyExpanded = new Set<string>();
let historyFocusNode: string | null = null;
const reading = new ReadingSequence();
const pages = new PageReader();
let titleVisible = true;
try { titleVisible = sessionStorage.getItem(titleKey) !== '1'; } catch { /* 저장 불가 환경에서도 시작할 수 있다. */ }
let viewKey = '';
let dismissedChoices = '';
let olderCount = 0;
let disposeLayout = () => {};
function sceneKey() { return state && story ? `${story.manifest.version}:${state.runId}:${state.history.length}:${state.currentNodeId ?? state.endingId}` : ''; }
function enterGame() {
  titleVisible = false;
  try { sessionStorage.setItem(titleKey, '1'); } catch { /* 게임 저장과 별개인 화면 표시 설정이다. */ }
  if (!state) newRun(); else render();
}
function returnToTitle() {
  if (busy || pending) return;
  openMenu = null; titleVisible = true;
  try { sessionStorage.removeItem(titleKey); } catch { /* 현재 화면에는 적용한다. */ }
  render();
}
function historyButton() {
  const open = button('전체 기록', () => { if (busy) return; openMenu = 'history'; render(); }, busy || Boolean(pending));
  open.dataset.menu = 'true'; open.dataset.menuKind = 'history'; open.prepend(icon('book'));
  return open;
}
function art(name: string) { return `${import.meta.env.BASE_URL}art/${name}-v1.webp`; }
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
  const known = new Set([...Object.keys(activeStory?.endings ?? context.endings), ...Object.keys(legacyStory?.endings ?? {}), ...(isCompact(context.manifest) ? galleryEndingIds : [])]);
  return new SaveStore(context, () => window.localStorage, known, isCompact(context.manifest) ? compactSlot : context.manifest.id);
}
function commit(next: GameState, nextReceipt: TransitionReceipt | null = null, context = story) {
  ensure(context, '저장소가 준비되지 않았습니다.');
  pending = next;
  pendingReceipt = nextReceipt;
  pendingStory = context;
  const nextStore = makeStore(context);
  meta = nextStore.commit(next, !isCompact(context.manifest) || !context.cinematics);
  story = context; store = nextStore; state = next;
  if (pendingResumeRun === next.runId) {
    updateCompactView({ handledHistory: next.history.length, phase: 0, memoryIndex: 0 });
    resumeChoiceRun = next.runId;
    pendingResumeRun = '';
  }
  pending = null; pendingReceipt = null; pendingStory = null; errorText = '';
}
function resumeFromEvent(nodeId?: string) {
  if (busy || pending || !story || !state || !compactMode) return;
  busy = true;
  try {
    const runId = crypto.randomUUID();
    const next = nodeId ? resumeAtVisitedNode(story, state, nodeId, runId) : loadReselectBackup(window.localStorage, story, runId);
    // 원장을 교체하기 전에 현재 회차 백업이 성공했는지 확인한다.
    backupBeforeReselect(window.localStorage, state);
    pendingResumeRun = next.runId;
    compatibilityNotice = '';
    commit(next);
    openMenu = null; historyExpanded.clear();
  } catch (error) { notify(error); }
  finally { busy = false; render(); }
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
function newRun() {
  if (busy || !activeStory) return;
  busy = true;
  try {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    commit(createRun(activeStory, seed, crypto.randomUUID()), null, activeStory);
    titleVisible = false;
    try { sessionStorage.setItem(titleKey, '1'); } catch { /* 화면 표시 설정만 실패한다. */ }
    compatibilityNotice = ''; openMenu = null; historyExpanded.clear();
  } catch (error) { notify(error); }
  finally { busy = false; render(); }
}

function render() {
  if (openMenu !== 'settings') endingDetailId = null;
  reading.detach();
  pages.detach();
  disposeLayout(); disposeLayout = () => {};
  const nextKey = sceneKey();
  const scroll = nextKey === viewKey ? root.querySelector<HTMLElement>('.chat-feed')?.scrollTop ?? 0 : 0;
  if (nextKey !== viewKey) { olderCount = 0; dismissedChoices = ''; viewKey = nextKey; }
  const last = state?.history.at(-1);
  const aftermath = Boolean(story && state && isCompact(story.manifest) && last && compactView().handledHistory < state.history.length && confirmedChoice(story, last).outcome.narrative);
  const cinematic = Boolean(story?.cinematics && state?.ended && !aftermath);
  if (cinematic && state && story && compactView().phase === 3 && !(meta.discoveredEndings[state.storyId] ?? []).includes(state.endingId!)) {
    try { meta = store!.commit(state); } catch (error) { errorText = error instanceof Error ? error.message : String(error); }
  }
  root.replaceChildren();
  const layout = element('main', undefined, titleVisible ? 'title-shell' : cinematic ? 'cinematic-shell' : 'game-shell'); root.append(layout);
  if (compactMode) layout.classList.add('compact-game');
  if (readMode === 'page') layout.classList.add('page-layout');
  if (titleVisible) renderTitle(layout);
  else if (state && !aftermath && !cinematic) renderStatus(layout, state);
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
  if (titleVisible) { if (openMenu) renderMenu(layout); return; }
  if (aftermath && state && last) {
    renderAftermath(layout, story, state);
    if (openMenu) renderMenu(layout);
    return;
  }
  if (cinematic && state) {
    disposeLayout = renderCompactEnding(layout, story, state, compactView(), {
      paused: Boolean(openMenu) || readMode === 'page', onProgress: patch => { updateCompactView(patch); render(); }, onRestart: newRun,
      onSettings: () => { openMenu = 'settings'; render(); },
    });
    if (openMenu) renderMenu(layout);
    return;
  }
  if (story.presentationWarning || compatibilityNotice) {
    const note = element('details', undefined, 'notice'); note.append(element('summary', '콘텐츠 및 저장 안내'), element('p', [compatibilityNotice, story.presentationWarning].filter(Boolean).join(' '))); layout.append(note);
  }
  if (state) {
    const frame = element('section', undefined, 'life-frame');
    const past = element('aside', undefined, 'life-column'); past.setAttribute('aria-label', compactMode ? '최근 연대기' : '나의 인생');
    renderTimeline(past, story, state); frame.append(past);
    const columns = element('div', undefined, 'game-columns chat-feed'); columns.setAttribute('aria-label', '사건과 대화'); columns.tabIndex = 0;
    if (readMode !== 'page') renderPreviousScenes(columns, story, state);
    const present = element('section', undefined, 'event-column');
    present.id = 'current-event'; present.tabIndex = -1; present.setAttribute('aria-label', '현재 사건');
    const last = state.history.at(-1);
    if (last) {
      const confirmed = confirmedChoice(story, last);
      const result = element('section', undefined, 'receipt'); result.setAttribute('role', 'status');
      result.append(element('p', `지난 선택 판정: ${resultLabels[confirmed.outcome.result]} · ${state.history.length}번째 선택`, 'receipt-label'), element('p', `${confirmed.choice.text} → ${confirmed.destination}`, 'receipt-text')); present.append(result);
    }
    if (state.ended) renderEnding(present, story, state); else renderScene(present, story, state);
    if (readMode === 'page') pageWindow(columns, present); else columns.append(present);
    frame.append(columns);
    const launch = button('선택지 보기', () => { if (busy || pending) return; dismissedChoices = ''; root.querySelector<HTMLDialogElement>('#choice-dialog')?.showModal(); }, busy || Boolean(pending));
    launch.classList.add('choice-launch'); launch.dataset.whenReady = 'normal'; frame.append(launch);
    layout.append(frame);
    columns.scrollTop = readMode === 'page' ? 0 : scroll;
    const toolbar = renderToolbar(layout);
    if (readMode === 'page') bindPages(layout, columns, toolbar, state, launch);
    else bindReading(layout, columns, toolbar, story, state, launch);
    if (resumeChoiceRun === state.runId && !state.ended && !openMenu) {
      resumeChoiceRun = '';
      toolbar.querySelector<HTMLButtonElement>('#reading-skip')!.click();
    }
  } else {
    layout.append(element('section', '검증된 저장을 불러오지 못했습니다. 기존 저장을 백업한 뒤 새 회차를 시작하거나 호환되는 JSON을 가져오세요.', 'panel'));
    const toolbar = renderToolbar(layout); toolbar.querySelectorAll<HTMLButtonElement>('.reading-controls button').forEach(b => { b.disabled = true; });
  }
  if (openMenu) renderMenu(layout);
}
function pageWindow(parent: HTMLElement, prose: HTMLElement) {
  parent.classList.add('page-feed');
  const viewport = element('div', undefined, 'page-window'); viewport.tabIndex = 0; viewport.setAttribute('aria-label', '이야기 페이지');
  const content = element('div', undefined, 'page-pages'); content.append(prose); viewport.append(content); parent.append(viewport);
  return { viewport, content };
}
function bindPages(layout: HTMLElement, columns: HTMLElement, toolbar: HTMLElement, current: GameState, launch: HTMLButtonElement) {
  launch.hidden = current.ended;
  const life = layout.querySelector<HTMLElement>('.life-panel')!;
  const sizePopup = () => {
    const floor = toolbar.getBoundingClientRect().height + 10;
    layout.style.setProperty('--choice-floor', `${floor}px`);
    layout.style.setProperty('--choice-space', `${Math.max(120, innerHeight - life.getBoundingClientRect().bottom - floor - 12)}px`);
  };
  const sizes = new ResizeObserver(sizePopup); sizes.observe(life); sizes.observe(toolbar); disposeLayout = () => sizes.disconnect(); sizePopup();
  const ready = () => {
    if (current.ended || pending || openMenu || dismissedChoices === sceneKey()) return;
    const dialog = layout.querySelector<HTMLDialogElement>('#choice-dialog'); if (dialog && !dialog.open) dialog.showModal();
  };
  pages.bind({
    key: sceneKey(), viewport: columns.querySelector('.page-window')!, content: columns.querySelector('.page-pages')!, surface: columns,
    toolbar, paused: Boolean(openMenu), canChoose: () => !busy && !pending,
    gates: [...layout.querySelectorAll<HTMLElement>('.choices'), ...(current.ended ? [] : [launch])],
    choiceButtons: [...layout.querySelectorAll<HTMLButtonElement>('[data-choice]')], finishLabel: current.ended ? '읽기 완료' : '선택지', onComplete: ready,
  });
}
function renderAftermath(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const last = current.history.at(-1)!;
  const confirmed = confirmedChoice(content, last);
  const frame = element('section', undefined, 'life-frame aftermath-frame'); frame.id = 'choice-aftermath';
  const heading = element('div', undefined, 'aftermath-heading');
  heading.append(element('p', `${last.age}세 · ${content.nodes[last.nodeId]!.title}`, 'eyebrow'), element('p', confirmed.choice.text, 'receipt-text'));
  frame.append(heading);
  const prose = renderNarrative(confirmed.outcome.narrative!, undefined, true); prose.classList.add('aftermath-prose');
  const paged = readMode === 'page' ? pageWindow(frame, prose) : null;
  if (!paged) frame.append(prose);
  layout.append(frame);
  const toolbar = renderToolbar(layout);
  const steps: ReadingStep[] = [...prose.querySelectorAll<HTMLElement>('.story-paragraph')].map(element => ({ element, stage: 'scene' }));
  const runId = current.runId; const count = current.history.length;
  const complete = () => { if (state?.runId !== runId || state.history.length !== count) return; updateCompactView({ handledHistory: count }); render(); };
  if (paged) {
    pages.bind({ key: `${sceneKey()}:aftermath`, ...paged, surface: frame, toolbar, paused: Boolean(openMenu), canChoose: () => false, gates: [], finishLabel: '이어서', onComplete: complete });
    return;
  }
  reading.bind({
    key: `${sceneKey()}:aftermath`, steps, surface: frame, controls: toolbar.querySelector('.reading-controls')!, status: toolbar.querySelector('.reading-status')!,
    faster: toolbar.querySelector('#reading-faster')!, skip: toolbar.querySelector('#reading-skip')!, pause: toolbar.querySelector('#reading-pause')!, keepControls: true,
    gates: [], paused: Boolean(openMenu), canChoose: () => false,
    onReveal: step => step.element.scrollIntoView({ block: 'nearest', behavior: 'instant' }), onSkip: () => {},
    onComplete: complete,
  });
}
function renderTitle(layout: HTMLElement) {
  const cover = element('img'); cover.src = art('background'); cover.alt = ''; cover.className = 'title-background'; layout.append(cover);
  const title = element('section', undefined, 'title-card');
  title.append(element('p', '한 사람의 선택, 한 번의 일생', 'eyebrow'), element('h1', '가짜 마왕의 일생'), element('p', '선택은 행동의 시도입니다. 당신의 일생을 읽고, 다음 행동을 고르세요.', 'title-intro'));
  const start = button(state ? '이어하기' : '시작하기', enterGame, !story || (!state && Boolean(errorText))); start.dataset.enter = 'true'; title.append(start);
  if (compactMode) title.append(button('새로하기', newRun, !activeStory || busy || Boolean(pending)));
  title.append(element('p', compactMode && story ? `축소 완결판 · ${Object.keys(story.nodes).length}개 사건 · ${Object.keys(story.endings).length}개 결말` : '원작 · 98개 장면 · 34개 결말', 'subtle'));
  const settings = button('설정', () => { openMenu = 'settings'; render(); }, !story); settings.setAttribute('aria-label', '저장 관리 · 엔딩 도감'); title.append(settings);
  layout.append(title);
}
function renderStatus(layout: HTMLElement, current: GameState) {
  const header = element('header', undefined, 'game-header');
  const player = element('figure', undefined, 'portrait player-portrait');
  const portrait = element('img'); portrait.id = 'player-image'; portrait.src = compactMode ? canonicalPortrait(import.meta.env.BASE_URL, 'player')! : portraitUrl(import.meta.env.BASE_URL, 'player', current.age); portrait.alt = '주인공 초상화'; player.append(portrait); header.append(player);
  const stats = element('section', undefined, 'stats'); stats.setAttribute('aria-label', '현재 능력치');
  for (const [label, value] of [['나이', `${current.age}세`], ['전투력', current.player.combat.toLocaleString('ko-KR')], ['마력', current.player.magic.toLocaleString('ko-KR')], ['금화', current.player.gold.toLocaleString('ko-KR')]]) {
    const stat = element('div'); stat.append(element('small', label), element('strong', value)); stats.append(stat);
  }
  header.append(stats);
  if (compactMode) {
    const open = historyButton(); open.classList.add('header-history'); header.append(open); layout.append(header); return;
  }
  const npc = element('figure', undefined, 'portrait npc-portrait');
  const image = element('img'); image.src = art('background'); image.alt = '연대기 배경'; image.id = 'npc-image';
  npc.append(image); header.append(npc); layout.append(header);
}
function renderToolbar(layout: HTMLElement) {
  const toolbar = element('footer', undefined, 'game-toolbar'); toolbar.setAttribute('aria-label', '게임 조작');
  const status = element('p', undefined, 'reading-status'); status.setAttribute('aria-live', 'polite');
  const controls = element('nav', undefined, 'reading-controls'); controls.setAttribute('aria-label', '읽기 조작');
  const faster = button('빠르게', () => {}); faster.setAttribute('aria-label', '빠르게 표시'); faster.id = 'reading-faster';
  const skip = button('스킵', () => {}); skip.id = 'reading-skip'; skip.setAttribute('aria-label', '스킵 · 바로 선택하기');
  const pause = button('일시정지', () => {}); pause.id = 'reading-pause'; controls.append(faster, skip, pause);
  const people = button('인물', () => { if (busy) return; openMenu = 'people'; render(); }, busy); people.setAttribute('aria-label', '인물 관계 · 재산 · 법적 기록'); people.dataset.menu = 'true'; people.dataset.menuKind = 'people';
  const settings = button('설정', () => { if (busy) return; openMenu = 'settings'; render(); }, busy); settings.setAttribute('aria-label', '저장 관리 · 엔딩 도감'); settings.dataset.menu = 'true'; settings.dataset.menuKind = 'settings';
  const buttons = element('div', undefined, 'toolbar-buttons'); buttons.append(controls, people, settings);
  const statusRow = element('div', undefined, 'toolbar-status'); statusRow.append(status);
  if (compactMode) {
    const mode = button(readMode === 'page' ? '스크롤 방식' : '페이지 방식', () => {
      if (busy || pending) return;
      readMode = readMode === 'page' ? 'scroll' : 'page';
      try { localStorage.setItem(readModeKey, readMode); } catch { /* 화면에는 적용하고 세이브는 유지한다. */ }
      render();
    }, busy || Boolean(pending)); mode.id = 'reading-mode'; mode.dataset.menu = 'true'; statusRow.append(mode);
  }
  statusRow.append(element('span', pending ? '저장 미완료' : '자동 저장', 'save-indicator'));
  toolbar.append(statusRow, buttons); layout.append(toolbar); return toolbar;
}
function renderPreviousScenes(feed: HTMLElement, content: PresentedStory, current: GameState) {
  const ids = [...current.enteredNodeIds].reverse().filter(id => id !== current.currentNodeId);
  if (!ids.length) return;
  const older = element('div', undefined, 'older-scenes');
  const load = button('↑ 이전 사건 불러오기', () => prepend()); load.classList.add('load-older');
  const add = (id: string) => {
    const node = content.nodes[id]!;
    const event = current.history.find(h => h.nodeId === id);
    const block = element('section', undefined, 'past-chat'); block.dataset.nodeId = id;
    block.append(element('p', `${node.age}세 · ${node.title}`, 'eyebrow'));
    if (!isCompact(content.manifest)) block.append(renderNarrative(node.body, content.presentation?.nodes[id]));
    if (event) { const result = confirmedChoice(content, event); block.append(element('p', `${result.choice.text} → ${resultLabels[result.outcome.result]} · ${result.destination}`, 'past-decision')); }
    older.prepend(block);
  };
  for (const id of ids.slice(0, olderCount)) add(id);
  const prepend = () => {
    const id = ids[olderCount]; if (!id) return;
    const height = feed.scrollHeight; add(id); olderCount++;
    load.hidden = olderCount >= ids.length;
    feed.scrollTop += feed.scrollHeight - height;
  };
  load.hidden = olderCount >= ids.length; feed.append(load, older);
  let upward = false; let touchY = 0; let touchLoaded = false;
  feed.addEventListener('wheel', event => { if (event.deltaY < 0) { upward = true; if (feed.scrollTop < 60) { prepend(); upward = false; } } }, { passive: true });
  feed.addEventListener('touchstart', event => { touchY = event.touches[0]?.clientY ?? 0; touchLoaded = false; }, { passive: true });
  feed.addEventListener('touchmove', event => {
    if (!touchLoaded && (event.touches[0]?.clientY ?? 0) > touchY + 20) {
      upward = true;
      if (feed.scrollTop < 60) { prepend(); upward = false; touchLoaded = true; }
    }
  }, { passive: true });
  feed.addEventListener('keydown', event => { if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) { upward = true; if (feed.scrollTop < 60) { prepend(); upward = false; } } });
  feed.addEventListener('scroll', () => { if (upward && feed.scrollTop < 60) { prepend(); upward = false; touchLoaded = true; } });
}
function bindReading(layout: HTMLElement, columns: HTMLElement, toolbar: HTMLElement, content: PresentedStory, current: GameState, launch: HTMLButtonElement) {
  const steps: ReadingStep[] = [];
  for (const row of columns.querySelectorAll<HTMLElement>('#current-event .chronicle-message')) steps.push({ element: row, stage: 'chronicle' });
  // 본문 한 단락과 각 화자의 대사를 순서대로 표시한다. 전체 기록은 즉시 열람 가능하다.
  for (const line of columns.querySelectorAll<HTMLElement>('#current-event .story .narrative > .body, #current-event .story .dialogue-line, #current-event .story > .body, #current-event .ending-recap')) {
    steps.push({ element: line, stage: 'scene', companions: readingCompanions(line) });
  }
  const controls = toolbar.querySelector<HTMLElement>('.reading-controls')!;
  const status = toolbar.querySelector<HTMLElement>('.reading-status')!;
  const faster = toolbar.querySelector<HTMLButtonElement>('#reading-faster')!; const skip = toolbar.querySelector<HTMLButtonElement>('#reading-skip')!;
  const pause = toolbar.querySelector<HTMLButtonElement>('#reading-pause')!;
  const gates = [...layout.querySelectorAll<HTMLElement>('.choices, #current-event .story > h3, #current-event .story > ol, #current-event .story > .subtle, #current-event .story > button'), ...(current.ended ? [] : [launch])];
  launch.hidden = current.ended;
  const life = layout.querySelector<HTMLElement>('.life-panel')!; life.tabIndex = -1;
  const showNpc = (name?: string, emotion: PortraitEmotion = 'neutral') => {
    const id = Object.keys(content.characters).find(id => content.characters[id]!.name === name && current.npcs[id]?.alive && (portraitCharacters as readonly string[]).includes(id));
    const image = layout.querySelector<HTMLImageElement>('#npc-image')!;
    image.src = id ? portraitUrl(import.meta.env.BASE_URL, id as PortraitCharacter, current.age, emotion) : art('background'); image.alt = id ? `${name} 초상화` : '연대기 배경';
  };
  const ready = () => {
    if (current.ended || pending || openMenu || dismissedChoices === sceneKey()) return;
    const dialog = layout.querySelector<HTMLDialogElement>('#choice-dialog'); if (dialog && !dialog.open) dialog.showModal();
  };
  const sizePopup = () => {
    const floor = toolbar.getBoundingClientRect().height + 10;
    layout.style.setProperty('--choice-floor', `${floor}px`);
    layout.style.setProperty('--choice-space', `${Math.max(120, innerHeight - life.getBoundingClientRect().bottom - floor - 12)}px`);
  };
  const sizes = new ResizeObserver(sizePopup); sizes.observe(life); sizes.observe(toolbar); sizes.observe(layout);
  disposeLayout = () => sizes.disconnect(); sizePopup();
  reading.bind({
    key: sceneKey(),
    steps, surface: columns.parentElement!, controls, status, faster, skip, pause, keepControls: true,
    choiceButtons: [...layout.querySelectorAll<HTMLButtonElement>('[data-choice]')], gates, paused: Boolean(openMenu),
    canChoose: () => !busy && !pending,
    onStage: (stage, step) => {
      columns.querySelector<HTMLElement>('#current-event .scene-heading')!.hidden = stage === 'chronicle';
      const player = layout.querySelector<HTMLImageElement>('#player-image')!;
      if (compactMode) {
        player.src = canonicalPortrait(import.meta.env.BASE_URL, 'player')!;
        return;
      }
      if (stage === 'chronicle') { showNpc(); player.src = portraitUrl(import.meta.env.BASE_URL, 'player', current.age); }
      else if (current.currentNodeId) {
        const dialogues = content.presentation?.nodes[current.currentNodeId]?.dialogues ?? [];
        const index = Number(step?.element.dataset.dialogueIndex ?? -1);
        const shown = dialogues.map((line, i) => ({ ...line, index: i })).slice(0, index + 1);
        const npc = [...shown].reverse().find(d => Object.values(content.characters).some(c => c.name === d.speaker));
        const defaultNpc = dialogues.find(d => Object.values(content.characters).some(c => c.name === d.speaker));
        showNpc(npc?.speaker ?? defaultNpc?.speaker, npc ? dialogueEmotion(current.currentNodeId, npc.index) : 'neutral');
        const self = [...shown].reverse().find(d => d.speaker === '가짜 마왕');
        player.src = portraitUrl(import.meta.env.BASE_URL, 'player', current.age, self ? dialogueEmotion(current.currentNodeId, self.index) : 'neutral');
      }
    },
    onReveal: (step, first) => {
      if (first && step.stage === 'chronicle') life.focus({ preventScroll: true });
      step.element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    },
    onSkip: () => {}, onComplete: ready,
  });
}
function renderSettings(save: HTMLElement) {
  if (!story) return;
  if (!titleVisible) save.append(button('타이틀로 가기', returnToTitle, busy || Boolean(pending)));
  if (compactMode && state) save.append(button('지난 분기에서 이어하기', () => { openMenu = 'history'; render(); }, busy || Boolean(pending)));
  const display = element('section', undefined, 'display-settings');
  const label = element('label', '화면 전체 글자 크기'); label.htmlFor = 'text-size';
  const size = element('input'); size.id = 'text-size'; size.type = 'range'; size.min = '100'; size.max = '150'; size.step = '10'; size.value = String(textPercent);
  const output = element('output'); output.htmlFor = 'text-size';
  const hint = element('p', '100%는 현재 기본 크기입니다. 더 작게 줄어들지 않습니다.', 'subtle');
  const message = element('p', '', 'subtle'); message.setAttribute('role', 'status');
  const update = (value: number) => {
    textPercent = value; size.value = String(value);
    document.documentElement.style.setProperty('--text-scale', String(value / 100));
    output.textContent = `${value}%${value === 100 ? ' · 최소 크기' : ''}`;
    size.setAttribute('aria-valuetext', output.textContent);
    smaller.disabled = value === 100; larger.disabled = value === 150;
  };
  const change = (value: number) => {
    update(value);
    try { localStorage.setItem(textSizeKey, String(value)); message.textContent = ''; }
    catch { message.textContent = '현재 화면에는 적용했습니다. 이 브라우저에서는 크기 설정을 저장할 수 없습니다.'; }
  };
  const smaller = button('작게', () => change(Math.max(100, textPercent - 10)));
  const larger = button('크게', () => change(Math.min(150, textPercent + 10)));
  size.addEventListener('input', () => change(Number(size.value)));
  const controls = element('div', undefined, 'text-size-controls'); controls.append(smaller, size, larger);
  update(textPercent);
  display.append(label, output, controls, hint, element('p', '연대기와 대사, 선택지와 버튼까지 이 크기로 표시됩니다.', 'text-size-preview'), message); save.append(display);
  const brightness = element('section', undefined, 'display-settings');
  const brightnessLabel = element('label', '화면 전체 글자 밝기'); brightnessLabel.htmlFor = 'text-brightness';
  const slider = element('input'); slider.id = 'text-brightness'; slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
  const brightnessOutput = element('output'); brightnessOutput.htmlFor = slider.id;
  const brightnessMessage = element('p', '', 'subtle'); brightnessMessage.setAttribute('role', 'status');
  const updateBrightness = (value: number) => {
    textBrightness = value; slider.value = String(value);
    document.documentElement.style.setProperty('--text-brightness', `${value}%`);
    brightnessOutput.textContent = `${value}% · ${value === 0 ? '짙은 회색' : value === 100 ? '기존 밝기' : '부드러운 글자색'}`;
    slider.setAttribute('aria-valuetext', brightnessOutput.textContent);
    darker.disabled = value === 0; brighter.disabled = value === 100;
    try { localStorage.setItem(textBrightnessKey, String(value)); brightnessMessage.textContent = ''; }
    catch { brightnessMessage.textContent = '현재 화면에는 적용했습니다. 이 브라우저에서는 밝기 설정을 저장할 수 없습니다.'; }
  };
  const darker = button('어둡게', () => updateBrightness(Math.max(0, textBrightness - 5)));
  const brighter = button('밝게', () => updateBrightness(Math.min(100, textBrightness + 5)));
  slider.addEventListener('input', () => updateBrightness(Number(slider.value)));
  const brightnessControls = element('div', undefined, 'text-size-controls'); brightnessControls.append(darker, slider, brighter);
  slider.value = String(textBrightness); brightnessOutput.textContent = `${textBrightness}% · ${textBrightness === 0 ? '짙은 회색' : textBrightness === 100 ? '기존 밝기' : '부드러운 글자색'}`;
  slider.setAttribute('aria-valuetext', brightnessOutput.textContent); darker.disabled = textBrightness === 0; brighter.disabled = textBrightness === 100;
  brightness.append(brightnessLabel, brightnessOutput, brightnessControls, element('p', '짙은 회색부터 지금의 밝기까지 조절합니다. 그림과 배경은 그대로 유지됩니다.', 'subtle'), button('기본 밝기', () => updateBrightness(100)), brightnessMessage);
  save.append(brightness);
  const tools = element('div', undefined, 'tools');
  const exportButton = button('회차 JSON 내보내기', exportRun, busy); exportButton.dataset.whenReady = 'normal'; tools.append(exportButton);
  const restart = button(state ? '새 회차 시작' : '기존 회차를 교체하고 시작', newRun, busy || Boolean(pending)); restart.dataset.whenReady = 'normal'; tools.append(restart);
  let backup: string | null = null; try { backup = window.localStorage.getItem(backupKey(compactMode ? compactSlot : undefined)); } catch { /* 저장 오류는 기존 오류 영역에서 안내한다. */ }
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
      backupBeforeImport(window.localStorage, compactMode ? compactSlot : undefined);
      commit(resolved.state, null, resolved.story); compatibilityNotice = resolved.notice; openMenu = null;
    } catch (error) { notify(error); }
    finally { busy = false; render(); }
  });
  tools.append(fileLabel, input); save.append(tools);
  save.append(element('p', `${pending ? '자동 저장 미완료' : state ? '자동 저장 완료' : '저장 확인 필요'} · 현재 브라우저에 보관됩니다. JSON으로 기기 간 이동할 수 있습니다.`, 'subtle'));
  const discovered = new Set(meta.discoveredEndings[story.manifest.id] ?? []);
  const allEndings = { ...legacyStory?.endings, ...activeStory?.endings };
  if (compactMode && isCompact(story.manifest)) {
    save.append(renderEndingGallery(endingGalleryEntries(activeStory ?? story), discovered, id => {
      if (!discovered.has(id)) return;
      endingDetailId = id; render();
    }, Object.keys((activeStory ?? story).endings).filter(id => galleryEndingIds.includes(id)).length));
    for (const id of discovered) if (!galleryEndingIds.includes(id) && allEndings[id]) save.append(element('p', `이전 예제에서 발견 · ${allEndings[id]!.title}`));
    return;
  }
  const collection = element('ul');
  for (const ending of Object.values(activeStory?.endings ?? story.endings)) collection.append(element('li', discovered.has(ending.id) ? `발견 · ${ending.title}` : '미발견 엔딩'));
  for (const id of discovered) if (!activeStory?.endings[id] && allEndings[id]) collection.append(element('li', `이전 예제에서 발견 · ${allEndings[id]!.title}`));
  save.append(element('h3', '엔딩 도감'), element('p', `발견한 엔딩 ${[...discovered].filter(id => activeStory?.endings[id]).length} / ${Object.keys(activeStory?.endings ?? story.endings).length}`), collection);
}
function renderScene(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const node = content.nodes[current.currentNodeId!]!;
  const panel = element('section', undefined, 'panel story');
  const presentation = content.presentation?.nodes[node.id];
  const events = lifeEvents(content, current);
  if (!current.history.length) for (const event of events.filter(event => event.kind === 'origin')) panel.append(element('p', `${event.age}세 · ${event.summary}`, 'chronicle-message'));
  if (!isCompact(content.manifest)) panel.append(element('p', `${node.age}세 · ${presentation?.chronicleSummary ?? node.title}`, 'chronicle-message'));
  const heading = element('div', undefined, 'scene-heading');
  heading.append(element('p', `${current.age}세 · 현재 사건`, 'eyebrow'));
  if (presentation?.locationLabel) heading.append(element('p', presentation.locationLabel, 'location'));
  const title = element('h2', node.title); title.id = 'scene-title'; title.tabIndex = -1;
  heading.append(title);
  const narrative = renderNarrative(node.body, presentation, isCompact(content.manifest));
  if (isCompact(content.manifest)) illustrateNarrative(narrative, node.id, !current.history.length, { age: current.age, body: node.body });
  panel.append(heading, narrative);
  const dialog = element('dialog', undefined, 'choice-dialog'); dialog.id = 'choice-dialog';
  const top = element('div', undefined, 'choice-dialog-heading');
  const prompt = element('h2', '어떻게 행동할까?', 'choice-prompt'); prompt.id = 'choice-title'; dialog.setAttribute('aria-labelledby', prompt.id);
  const lower = () => { dismissedChoices = sceneKey(); dialog.close(); root.querySelector<HTMLButtonElement>('.choice-launch')?.focus({ preventScroll: true }); };
  top.append(prompt, button('잠시 내리기', lower)); dialog.append(top);
  dialog.addEventListener('cancel', event => { event.preventDefault(); lower(); });
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
  dialog.append(choices); layout.append(panel, dialog);
}
function renderEnding(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const ending = content.endings[current.endingId!]!;
  const panel = element('section', undefined, 'panel story');
  panel.append(element('p', `${current.age}세 · 회차 종료`, 'chronicle-message'));
  const heading = element('div', undefined, 'scene-heading'); heading.append(element('p', `회차 종료 · ${current.age}세`, 'eyebrow'));
  const title = element('h2', ending.title); title.id = 'scene-title'; title.tabIndex = -1;
  heading.append(title); panel.append(heading, element('p', ending.body, 'body'));
  for (const rule of ending.recapRules ?? []) if (evaluate(content, current, rule.when)) panel.append(element('p', rule.text, 'ending-recap'));
  const highlights = element('ol');
  for (const entry of current.history.slice(-5)) highlights.append(element('li', `${entry.age}세 · ${content.nodes[entry.nodeId]!.choices.find(c => c.id === entry.choiceId)!.text}`));
  panel.append(element('h3', '실제로 남긴 선택'), highlights, element('p', `발견 엔딩 ID: ${ending.id}`, 'subtle'));
  const restart = button('새 회차 시작', newRun, busy || Boolean(pending)); restart.dataset.whenReady = 'normal'; panel.append(restart); layout.append(panel);
}
function renderPeople(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const people = element('div', undefined, 'people-list');
  for (const [id, npc] of Object.entries(current.npcs)) people.append(element('p', `${content.characters[id]!.name} · ${npc.alive ? '생존' : '사망'} · 전투력 ${npc.combat.toLocaleString('ko-KR')} · 신뢰 ${npc.trust} · 호감 ${npc.affection} · 관계 ${npc.relationship}`));
  people.append(element('p', `법적 상태: ${current.player.legalStatus}`), element('p', `유죄 확정 전과: ${current.player.crimes.join(', ') || '없음'}`), element('p', `소지품: ${Object.entries(current.inventory).map(([id, n]) => `${id} ${n}`).join(', ') || '없음'}`));
  layout.append(people);
}
function renderTimeline(layout: HTMLElement, content: PresentedStory, current: GameState) {
  const panel = element('section', undefined, 'panel life-panel');
  const top = element('div', undefined, 'panel-heading');
  if (!compactMode) { top.append(element('h2', '나의 인생'), element('span', `${current.history.length}번의 선택`, 'subtle'), historyButton()); panel.append(top); }
  const all = lifeEvents(content, current);
  const list = element('ol', undefined, 'timeline'); list.setAttribute('aria-label', '실제 인생 연대기');
  for (const event of all.slice(compactMode ? -1 : -3)) {
    const item = element('li', undefined, 'timeline-item'); item.dataset.eventId = event.id;
    if (event.nodeId) item.dataset.nodeId = event.nodeId;
    item.append(element('span', `${event.age}세`, 'timeline-age'));
    const text = element('div'); const summary = element('p', event.summary, 'timeline-text'); summary.title = event.summary; text.append(summary);
    if (event.result) text.append(element('span', resultLabels[event.result], 'timeline-result'));
    item.append(text); list.append(item);
    if (compactMode && event.nodeId) {
      const openEvent = () => { if (busy || pending) return; historyFocusNode = event.nodeId!; historyExpanded.add(event.id); openMenu = 'history'; render(); };
      item.tabIndex = 0; item.setAttribute('role', 'button'); item.setAttribute('aria-label', `${event.age}세 · ${event.title} · 분기 다시 선택`);
      item.addEventListener('click', openEvent);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEvent(); } });
    }
  }
  panel.append(list); layout.append(panel);
}
function renderMenu(layout: HTMLElement) {
  const dialog = element('dialog', undefined, 'menu-dialog');
  const menuKind = openMenu;
  const detail = menuKind === 'settings' && compactMode && activeStory && endingDetailId
    && (meta.discoveredEndings[activeStory.manifest.id] ?? []).includes(endingDetailId)
    ? endingGalleryEntries(activeStory).find(entry => entry.id === endingDetailId) : undefined;
  const title = element('h2', detail ? '엔딩 도감 상세' : menuKind === 'history' ? '전체 인생 기록' : menuKind === 'people' ? '인물 관계 · 재산 · 법적 기록' : '저장 관리 · 엔딩 도감'); title.id = 'menu-title';
  dialog.setAttribute('aria-labelledby', title.id);
  const close = () => {
    if (detail) { galleryReturnFocus = detail.id; endingDetailId = null; render(); return; }
    openMenu = null; dialog.close(); render(); document.querySelector<HTMLButtonElement>(`[data-menu-kind="${menuKind}"]`)?.focus();
  };
  const top = element('div', undefined, 'panel-heading'); top.append(title, button('닫기', close)); dialog.append(top);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  if (detail) dialog.append(renderEndingDetail(detail));
  else if (menuKind === 'settings') renderSettings(dialog);
  else if (menuKind === 'people' && story && state) renderPeople(dialog, story, state);
  else if (story && state) {
    if (compactMode) {
      dialog.append(element('p', '지나온 사건의 선택 직전부터 이어합니다. 이후 기록은 새 선택으로 바뀌며 발견한 엔딩은 유지됩니다.', 'subtle'));
      let hasBackup = false; try { hasBackup = localStorage.getItem(RESELECT_BACKUP_KEY) !== null; } catch { /* 회차는 그대로 유지한다. */ }
      if (hasBackup) dialog.append(button('재선택 전 회차 복원', () => resumeFromEvent(), busy || Boolean(pending)));
    }
    for (const event of lifeEvents(story, state)) {
      const row = element('details', undefined, 'history-entry'); row.dataset.eventId = event.id;
      row.append(element('summary', `${event.age}세 · ${event.kind === 'origin' ? event.summary : event.title}`));
      if (event.kind !== 'origin') row.append(element('p', event.summary));
      if (event.choiceText && event.result) row.append(element('p', `${event.choiceText} · ${resultLabels[event.result]} → ${event.destination}`, 'history-decision'));
      if (event.nodeId) {
        const node = story.nodes[event.nodeId]!;
        if (!isCompact(story.manifest)) row.append(renderNarrative(node.body, story.presentation?.nodes[event.nodeId]));
        if (compactMode) {
          const resume = button(event.nodeId === state.currentNodeId ? '이 사건 이어하기' : '여기부터 재선택', () => resumeFromEvent(event.nodeId), busy || Boolean(pending));
          resume.dataset.resumeNode = event.nodeId; row.append(resume);
        }
      }
      row.open = compactMode || historyExpanded.has(event.id);
      row.addEventListener('toggle', () => { if (row.open) historyExpanded.add(event.id); else historyExpanded.delete(event.id); });
      dialog.append(row);
    }
  }
  layout.append(dialog); dialog.showModal();
  if (menuKind === 'settings' && galleryReturnFocus && !detail) {
    const target = [...dialog.querySelectorAll<HTMLButtonElement>('[data-ending-detail]')].find(b => b.dataset.endingDetail === galleryReturnFocus);
    target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); galleryReturnFocus = null;
  }
  if (menuKind === 'history' && historyFocusNode) {
    const target = [...dialog.querySelectorAll<HTMLButtonElement>('[data-resume-node]')].find(b => b.dataset.resumeNode === historyFocusNode);
    target?.scrollIntoView({ block: 'center', behavior: 'instant' }); target?.focus({ preventScroll: true }); historyFocusNode = null;
  }
}
async function boot() {
  try {
    [activeStory, legacyStory] = await Promise.all([
      loadBrowserStory(import.meta.env.BASE_URL, compactMode ? 'demon-king-compact' : 'demon-king'), loadBrowserStory(import.meta.env.BASE_URL, 'demon-king-legacy-phase1'),
    ]);
    story = activeStory; store = makeStore(story);
    backupBeforeImport(window.localStorage, compactMode ? compactSlot : undefined);
    if (compactMode) backupBeforeCompactUpgrade(window.localStorage);
    meta = store.loadMeta();
    const raw = store.raw();
    if (raw) {
      const resolved = resolveCompatibleSave(activeStory, legacyStory, raw);
      compatibilityNotice = resolved.notice; commit(resolved.state, null, resolved.story);
    }
    else if (!titleVisible) newRun();
  } catch (error) { notify(error); }
  finally { render(); }
}
// 브라우저 뒤로가기는 문서 이동만 한다. 게임 상태는 저장 원장으로만 복원한다.
window.addEventListener('pageshow', event => { if (event.persisted) { state = null; pending = null; compactViewData = null; compactViewRun = ''; void boot(); } });
void boot();
