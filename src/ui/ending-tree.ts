import type { GameState, Story } from '../engine/types';
import type { EndingGalleryEntry } from '../content/ending-gallery';
import { element, button } from './dom';
import { renderEndingDetail } from './ending-gallery';
import { TreeCamera, minimapTransform } from './tree-camera';
import { tree, byTreeId, layoutTree, nodeWidth, nodeHeight, stepsTo, visitStatus, lastVisitedFork, type TreeNode } from './ending-tree-layout';
import '../styles/ending-tree.css';

const NS = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, number | string> = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
export function openEndingTree(options: {
  story: Story; entries: EndingGalleryEntry[]; discovered: ReadonlySet<string>; state?: GameState | null;
  opener: HTMLElement; onResume: (nodeId: string) => void; onClose: () => void;
}) {
  const layout = layoutTree(), camera = new TreeCamera(), token = crypto.randomUUID();
  const dialog = element('dialog', undefined, 'ending-tree-dialog'); dialog.setAttribute('aria-label', '엔딩 분기 트리');
  const header = element('header', undefined, 'tree-header');
  const heading = element('h2', '엔딩 분기 트리');
  const controls = element('div', undefined, 'tree-controls');
  const viewport = element('div', undefined, 'tree-viewport'); viewport.tabIndex = 0; viewport.setAttribute('aria-label', '분기 지도: 드래그로 이동, 휠 또는 두 손가락으로 확대');
  const world = element('div', undefined, 'tree-world');
  const lines = svg('svg', { width: layout.bounds.width, height: layout.bounds.height }); lines.classList.add('tree-lines'); lines.setAttribute('aria-hidden', 'true');
  const nodeButtons = new Map<string, HTMLButtonElement>(), edgeElements = new Map<string, SVGPathElement>();
  const map = svg('svg', { viewBox: '0 0 180 110' }); map.classList.add('tree-minimap'); map.setAttribute('aria-label', '미니맵: 누르거나 드래그해 이동'); map.setAttribute('role', 'img');
  const mapMath = minimapTransform(layout.bounds, 180, 110);
  for (const edge of tree.edges) {
    const from = layout.positions.get(edge.from)!, to = layout.positions.get(edge.to)!;
    const path = svg('path', { d: `M${from.x + nodeWidth} ${from.y + nodeHeight / 2} C${from.x + nodeWidth + 25} ${from.y + nodeHeight / 2},${to.x - 25} ${to.y + nodeHeight / 2},${to.x} ${to.y + nodeHeight / 2}` });
    lines.append(path); edgeElements.set(edge.to, path);
  }
  world.append(lines);
  for (const node of tree.nodes) {
    const point = layout.positions.get(node.id)!;
    const open = button('', () => { if (!suppressClick) select(node); });
    open.className = 'tree-node'; open.dataset.treeNode = node.id; open.dataset.treeType = node.type;
    open.style.left = `${point.x}px`; open.style.top = `${point.y}px`; world.append(open); nodeButtons.set(node.id, open);
    open.addEventListener('focus', () => {
      if (closed || !viewport.clientWidth) return;
      const b = open.getBoundingClientRect(), v = viewport.getBoundingClientRect();
      if (b.left < v.left || b.right > v.right || b.top < v.top || b.bottom > v.bottom) center(node);
    });
    const dot = mapMath.project(point.x + nodeWidth / 2, point.y + nodeHeight / 2);
    map.append(svg('circle', { cx: dot.x, cy: dot.y, r: node.type === 'ending' ? 2 : 1.2, class: node.type === 'ending' ? 'mini-ending' : 'mini-node' }));
  }
  const mapRect = svg('rect', { class: 'mini-viewport' }); map.append(mapRect); viewport.append(world, map);
  const detail = element('aside', undefined, 'tree-detail'); detail.hidden = true; detail.tabIndex = -1; detail.setAttribute('aria-label', '사건과 선택 상세');
  const body = element('div', undefined, 'tree-body'); body.append(viewport, detail);
  const help = element('details', undefined, 'tree-help');
  help.append(element('summary', '검증 예시 경로 · 조작 안내'), element('p', '엔딩마다 한 가지 검증된 수집 예시이며 전체 분기는 아닙니다. 결과는 조건·판정에 따릅니다. 금색은 현재 회차와 일치하는 선택입니다. 배경 드래그·휠/두 손가락·미니맵으로 이동하며 노드 위치는 바뀌지 않습니다.'));
  const announcement = element('p', '', 'tree-announcement'); announcement.setAttribute('aria-live', 'polite');
  const zoomLabel = element('output', '', 'tree-zoom');
  const target = element('select'); target.setAttribute('aria-label', '목표 엔딩');
  const spoilerLabel = element('label', undefined, 'tree-spoiler-label'), spoiler = element('input'); spoiler.type = 'checkbox'; spoiler.dataset.treeSpoilers = 'true';
  spoilerLabel.append(spoiler, document.createTextNode('힌트·스포일러 경로 표시'));
  let selected: TreeNode | undefined, goal = '', closed = false, suppressClick = false, clickTimer: ReturnType<typeof setTimeout> | undefined;
  let lastSize = { width: 0, height: 0 };
  function publicLabel(node: TreeNode) {
    const status = visitStatus(node, options.state);
    if (node.type === 'origin') return '0세 · 출생신고';
    if (node.type === 'ending') {
      const index = options.entries.findIndex(entry => entry.id === node.endingId);
      return options.discovered.has(node.endingId!) || spoiler.checked ? options.entries[index]!.title : `미발견 엔딩 ${String(index + 1).padStart(2, '0')}`;
    }
    return status.selected || status.resumable || spoiler.checked ? `${node.age}세 · ${node.sceneTitle}` : '미방문 분기';
  }
  function updateLabels() {
    const savedTarget = target.value; target.replaceChildren();
    target.append(new Option('목표 엔딩 선택', ''));
    for (const entry of options.entries) target.append(new Option(publicLabel(byTreeId.get(`ending:${entry.id}`)!), entry.id));
    target.value = savedTarget;
    const goalNodes = new Set(goal ? spoiler.checked ? tree.routes[goal] : [`ending:${goal}`] : []);
    for (const node of tree.nodes) {
      const open = nodeButtons.get(node.id)!, status = visitStatus(node, options.state);
      const choice = node.type === 'step' && (status.selected || spoiler.checked) ? node.choiceText! : node.type === 'ending' ? (options.discovered.has(node.endingId!) ? '획득한 엔딩' : '잠금') : status.resumable ? '방문한 사건 · 다른 선택 가능' : '';
      open.replaceChildren(element('span', publicLabel(node)), element('small', choice)); open.setAttribute('aria-label', `${publicLabel(node)} ${choice}`);
      open.classList.toggle('is-visited', status.selected); open.classList.toggle('is-target', goalNodes.has(node.id));
      open.classList.toggle('is-dimmed', Boolean(goal) && !goalNodes.has(node.id)); open.classList.toggle('is-selected', selected?.id === node.id);
      edgeElements.get(node.id)?.classList.toggle('is-target', goalNodes.has(node.id));
    }
  }
  function draw() {
    if (closed) return;
    world.style.transform = `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.scale})`;
    viewport.scrollLeft = 0; viewport.scrollTop = 0;
    viewport.dataset.cameraX = String(camera.tx); viewport.dataset.cameraY = String(camera.ty); viewport.dataset.cameraScale = String(camera.scale);
    zoomLabel.value = `${Math.round(camera.scale * 100)}%`;
    const raw = mapMath.rect(camera.visibleWorldRect(viewport.clientWidth, viewport.clientHeight));
    // 표시 영역이 지도 전체보다 커도 사각형의 네 변이 미니맵 안에 보이게 한다.
    const clamp = (value: number, maximum: number) => Math.max(1, Math.min(maximum - 1, value));
    const x = clamp(raw.x, 180), y = clamp(raw.y, 110);
    const rect = { x, y, width: Math.max(.5, clamp(raw.x + raw.width, 180) - x), height: Math.max(.5, clamp(raw.y + raw.height, 110) - y) };
    for (const [key, value] of Object.entries(rect)) mapRect.setAttribute(key, String(value));
  }
  function fit() { camera.fit(layout.bounds, viewport.clientWidth, viewport.clientHeight); draw(); }
  function center(node: TreeNode) {
    const p = layout.positions.get(node.id)!; camera.scale = 1;
    camera.centerWorld(p.x + nodeWidth / 2, p.y + nodeHeight / 2, viewport.clientWidth, viewport.clientHeight); draw();
  }
  function confirmResume(node: TreeNode) {
    if (!visitStatus(node, options.state).resumable) return;
    const question = element('section', undefined, 'tree-resume-confirm'); question.setAttribute('role', 'group'); question.setAttribute('aria-label', '재선택 확인');
    question.append(element('p', '현재 회차를 백업하고 이 사건의 선택 직전부터 이어할까요? 이후 기록은 새 선택에 따라 바뀌며 획득한 엔딩은 유지됩니다.'));
    question.append(button('확인 · 여기부터 재선택', () => { if (!visitStatus(node, options.state).resumable) return; finish(); options.onResume(node.nodeId!); }), button('취소', () => question.remove()));
    detail.querySelector('.tree-resume-confirm')?.remove(); detail.append(question); question.querySelector('button')?.focus();
  }
  function select(node: TreeNode) {
    selected = node; detail.hidden = false; detail.replaceChildren(); updateLabels();
    detail.append(button('상세 접기', () => { detail.hidden = true; selected = undefined; updateLabels(); viewport.focus(); }), element('h3', publicLabel(node)));
    const status = visitStatus(node, options.state);
    if (node.type === 'ending') {
      if (options.discovered.has(node.endingId!)) detail.append(renderEndingDetail(options.entries.find(entry => entry.id === node.endingId)!));
      else detail.append(element('p', '아직 획득하지 않은 엔딩입니다. 그림과 결말은 잠겨 있습니다.'));
      if (spoiler.checked || options.discovered.has(node.endingId!)) {
        if (spoiler.checked) {
          const path = element('ol'); path.setAttribute('aria-label', '검증된 수집 경로');
          for (const step of stepsTo(node)) path.append(element('li', `${step.age}세 · ${step.sceneTitle} → ${step.choiceText}`));
          detail.append(path);
        } else detail.append(element('p', '선택 순서는 힌트·스포일러 표시를 켜면 볼 수 있습니다.'));
        const fork = lastVisitedFork(node.endingId!, options.state);
        if (fork) detail.append(element('p', `다시 선택할 수 있는 마지막 방문 분기: ${fork.age}세 · ${fork.sceneTitle}`), button('방문 분기 보기', () => { center(fork); select(fork); }));
        else detail.append(element('p', '현재 회차에서 이어갈 공통 방문 분기가 없습니다. 새 회차에서 수집할 수 있습니다.'));
      }
    } else if (node.type === 'step') {
      detail.append(element('p', status.selected ? '이 회차에서 실제 선택한 분기' : status.resumable ? '방문한 사건 · 이 선택 결과는 아직 선택하지 않았습니다.' : '이 회차에서 방문하지 않은 분기'));
      if (status.selected || spoiler.checked) {
        const scene = options.story.nodes[node.nodeId!]!, choice = scene.choices.find(choice => choice.id === node.choiceId)!;
        const outcome = choice.outcomes.find(outcome => outcome.id === node.outcomeId)!;
        detail.append(element('p', choice.text), element('p', choice.description ?? ''), element('p', outcome.narrative ?? ''));
        const condition = element('details'), text = element('pre', JSON.stringify({ enabledWhen: choice.enabledWhen, when: outcome.when, weight: outcome.weight }, null, 2));
        condition.append(element('summary', '선택·판정 조건'), text); detail.append(condition);
      } else detail.append(element('p', '힌트·스포일러 표시를 켜면 선택 정보를 볼 수 있습니다.'));
      if (status.resumable) detail.append(button('이 사건부터 재선택', () => confirmResume(node)));
    } else detail.append(element('p', '출생부터 시작하는 검증된 엔딩 수집 예시입니다. 트리 조작으로 사건이 진행되거나 엔딩이 해금되지는 않습니다.'));
    detail.focus({ preventScroll: true });
  }
  const find = () => {
    goal = target.value; updateLabels();
    if (!goal) { announcement.textContent = '목표 엔딩을 선택해 주세요.'; return; }
    const node = byTreeId.get(`ending:${goal}`)!; center(node); select(node); announcement.textContent = `${publicLabel(node)} 위치로 이동했습니다.`;
  };
  const enlarge = button('+', () => { camera.zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, 1.25); draw(); }); enlarge.setAttribute('aria-label', '확대');
  const reduce = button('−', () => { camera.zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, .8); draw(); }); reduce.setAttribute('aria-label', '축소');
  const findButton = button('찾기', find); findButton.setAttribute('aria-label', '목표 엔딩 찾기');
  controls.append(button('전체 보기', fit), enlarge, reduce, zoomLabel, target, findButton);
  const closeButton = button('닫기', () => finish()); header.append(heading, closeButton);
  dialog.append(header, controls, spoilerLabel, help, body, announcement);
  spoiler.addEventListener('change', () => { updateLabels(); if (selected) select(selected); });
  const pointers = new Map<number, { x: number; y: number; startX: number; startY: number }>();
  let pinch: { distance: number; scale: number; world: { x: number; y: number } } | undefined;
  function point(event: PointerEvent) { const b = viewport.getBoundingClientRect(); return { x: event.clientX - b.left, y: event.clientY - b.top }; }
  function resetPinch() {
    const [a, b] = [...pointers.values()];
    pinch = a && b ? { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale: camera.scale, world: camera.worldFromScreen((a.x + b.x) / 2, (a.y + b.y) / 2) } : undefined;
  }
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const p = point(event); pointers.set(event.pointerId, { ...p, startX: p.x, startY: p.y }); resetPinch();
    if (pointers.size > 1) suppressClick = true;
  });
  viewport.addEventListener('pointermove', event => {
    const before = pointers.get(event.pointerId); if (!before) return;
    const p = point(event);
    if (Math.hypot(p.x - before.startX, p.y - before.startY) > 8 || pointers.size > 1) suppressClick = true;
    pointers.set(event.pointerId, { ...before, ...p });
    if (!suppressClick) return;
    try { viewport.setPointerCapture(event.pointerId); } catch { /* 합성 이벤트/종료된 포인터 */ }
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      camera.scale = Math.max(camera.minScale, Math.min(camera.maxScale, pinch.scale * Math.hypot(a!.x - b!.x, a!.y - b!.y) / pinch.distance));
      camera.tx = (a!.x + b!.x) / 2 - pinch.world.x * camera.scale; camera.ty = (a!.y + b!.y) / 2 - pinch.world.y * camera.scale;
    } else camera.panBy(p.x - before.x, p.y - before.y);
    draw();
  });
  const release = (event: PointerEvent) => {
    pointers.delete(event.pointerId); resetPinch();
    try { if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); } catch { /* 이미 해제됨 */ }
    if (!pointers.size) { clearTimeout(clickTimer); clickTimer = setTimeout(() => { suppressClick = false; }, 250); }
  };
  viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release); viewport.addEventListener('lostpointercapture', event => { pointers.delete(event.pointerId); resetPinch(); });
  viewport.addEventListener('wheel', event => { event.preventDefault(); const b = viewport.getBoundingClientRect(); camera.zoomAt(event.clientX - b.left, event.clientY - b.top, Math.exp(-Math.max(-300, Math.min(300, event.deltaY)) * .002)); draw(); }, { passive: false });
  viewport.addEventListener('keydown', event => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] };
    if (moves[event.key]) { event.preventDefault(); camera.panBy(...moves[event.key]!); draw(); }
    else if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); camera.zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, event.key === '-' ? .8 : 1.25); draw(); }
    else if (event.key === 'Home') { event.preventDefault(); fit(); }
  });
  let miniPointer: number | undefined;
  const moveMap = (event: PointerEvent) => {
    const b = map.getBoundingClientRect(), p = mapMath.unproject((event.clientX - b.left) * 180 / b.width, (event.clientY - b.top) * 110 / b.height);
    camera.centerWorld(p.x, p.y, viewport.clientWidth, viewport.clientHeight); draw();
  };
  map.addEventListener('pointerdown', event => { event.stopPropagation(); event.preventDefault(); miniPointer = event.pointerId; try { map.setPointerCapture(event.pointerId); } catch { /* 합성 이벤트 */ } moveMap(event); });
  map.addEventListener('pointermove', event => { event.stopPropagation(); if (miniPointer === event.pointerId) moveMap(event); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) map.addEventListener(type, event => { event.stopPropagation(); miniPointer = undefined; });
  const observer = new ResizeObserver(() => {
    const width = viewport.clientWidth, height = viewport.clientHeight;
    if (!width || !height || (lastSize.width === width && lastSize.height === height)) return;
    if (lastSize.width) { const center = camera.worldFromScreen(lastSize.width / 2, lastSize.height / 2); camera.centerWorld(center.x, center.y, width, height); }
    lastSize = { width, height }; draw();
  });
  const onPop = () => { if (history.state?.endingTreeToken !== token) finish(false); };
  function finish(pop = true) {
    if (closed) return; closed = true; observer.disconnect(); clearTimeout(clickTimer); pointers.clear();
    window.removeEventListener('popstate', onPop); dialog.close(); dialog.remove();
    if (pop && history.state?.endingTreeToken === token) history.back();
    options.opener.focus({ preventScroll: true }); options.onClose();
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  document.body.append(dialog); dialog.showModal(); updateLabels(); fit(); lastSize = { width: viewport.clientWidth, height: viewport.clientHeight };
  observer.observe(viewport); history.pushState({ ...history.state, endingTreeToken: token }, ''); window.addEventListener('popstate', onPop); closeButton.focus();
  return () => finish();
}
