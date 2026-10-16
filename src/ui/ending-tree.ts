import type { GameState, Story } from '../engine/types';
import type { EndingGalleryEntry } from '../content/ending-gallery';
import { element, button } from './dom';
import { renderEndingDetail } from './ending-gallery';
import { TreeCamera, minimapTransform } from './tree-camera';
import { tree, byTreeId, layoutTree, nodeWidth, nodeHeight, stepsTo, visitStatus, lastVisitedFork, collectedRouteNodes, collectedRoutes, historyTreeIds, routeEdges, edgeKey, resumeSource, type TreeNode } from './ending-tree-layout';
import '../styles/ending-tree.css';

const NS = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, number | string> = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
export function openEndingTree(options: {
  story: Story; entries: EndingGalleryEntry[]; discovered: ReadonlySet<string>; state?: GameState | null;
  pastRuns?: readonly GameState[]; historyNotice?: string;
  opener: HTMLElement; onResume: (nodeId: string, source?: GameState) => void; onClose: () => void;
}) {
  const pastRuns = options.pastRuns ?? [];
  const collectedSources = options.state?.ended ? [options.state, ...pastRuns] : pastRuns;
  const collected = collectedRouteNodes(options.discovered, collectedSources);
  const collectedEdges = new Set(collectedRoutes(options.discovered, collectedSources).flatMap(routeEdges));
  const currentEdges = new Set(options.state ? routeEdges(historyTreeIds(options.state)) : []);
  const sourceFor = (node: TreeNode) => resumeSource(node, options.state, pastRuns);
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
  const miniNodes = new Map<string, SVGCircleElement>();
  const mapMath = minimapTransform(layout.bounds, 180, 110);
  for (const edge of tree.edges) {
    const from = layout.positions.get(edge.from)!, to = layout.positions.get(edge.to)!;
    const path = svg('path', { d: `M${from.x + nodeWidth} ${from.y + nodeHeight / 2} C${from.x + nodeWidth + 25} ${from.y + nodeHeight / 2},${to.x - 25} ${to.y + nodeHeight / 2},${to.x} ${to.y + nodeHeight / 2}` });
    if (edge.legacyVersion) { path.classList.add('is-legacy'); const title=svg('title'); title.textContent='구 회차2.3 전용 연결 · 새 회차는 인생 진입 사건을 거칩니다.';path.append(title); }
    lines.append(path); edgeElements.set(edgeKey(edge.from, edge.to), path); path.dataset.treeEdge = edgeKey(edge.from, edge.to);
  }
  world.append(lines);
  for (const node of tree.nodes) {
    const point = layout.positions.get(node.id)!;
    const open = button('', () => select(node));
    open.className = 'tree-node'; open.dataset.treeNode = node.id; open.dataset.treeType = node.type;
    open.style.left = `${point.x}px`; open.style.top = `${point.y}px`; world.append(open); nodeButtons.set(node.id, open);
    open.addEventListener('focus', () => {
      if (closed || pointers.size || gestureMoved || !viewport.clientWidth) return;
      const b = open.getBoundingClientRect(), v = viewport.getBoundingClientRect();
      if (b.left < v.left || b.right > v.right || b.top < v.top || b.bottom > v.bottom) center(node);
    });
    const dot = mapMath.project(point.x + nodeWidth / 2, point.y + nodeHeight / 2);
    const marker = svg('circle', { cx: dot.x, cy: dot.y, r: node.type === 'ending' ? 2 : 1.2, class: node.type === 'ending' ? 'mini-ending' : 'mini-node', 'data-tree-mini': node.id });
    map.append(marker); miniNodes.set(node.id, marker);
  }
  const mapRect = svg('rect', { class: 'mini-viewport' }); map.append(mapRect); viewport.append(world, map);
  const detail = element('aside', undefined, 'tree-detail'); detail.hidden = true; detail.tabIndex = -1; detail.setAttribute('aria-label', '사건과 선택 상세');
  const body = element('div', undefined, 'tree-body'); body.append(viewport, detail);
  const help = element('details', undefined, 'tree-help');
  const legend = element('summary');
  legend.append(element('span', '수집', 'tree-key-collected'), document.createTextNode(' · '), element('span', '현재', 'tree-key-current'), document.createTextNode(' · '), element('span', '목표', 'tree-key-target'), document.createTextNode(' · 조작 안내'));
  help.append(legend, element('p', `청록색은 수집 경로(실제 기록 우선, 없으면 검증 예시), 금색은 현재 회차의 실제 선택, 파란색은 목표의 검증 예시입니다. 경로가 겹치면 청록색 왼쪽 테두리와 금색으로 함께 표시합니다. ${Object.keys(options.story.nodes).length}개 사건·${Object.values(options.story.nodes).reduce((sum, node) => sum + node.choices.length, 0)}개 선택·${options.entries.length}개 엔딩의 전체 연결이며 실제 합류는 하나의 사건 노드로 공유합니다. 점선은 구 회차 전용 연결입니다. 검색·사건 노드의 접기/펼치기는 저장을 바꾸지 않습니다. 연결선은 가능한 목적지이며 조건·과거 선택에 따라 실제 통과 여부가 달라집니다. 실제 진행 기록이 있는 사건만 선택 직전부터 이어할 수 있습니다. 노드와 배경 어디서나 드래그·휠/두 손가락·미니맵으로 이동하며 노드 위치는 바뀌지 않습니다.`));
  if (options.historyNotice) help.append(element('p', options.historyNotice));
  const announcement = element('p', '', 'tree-announcement'); announcement.setAttribute('aria-live', 'polite');
  const zoomLabel = element('output', '', 'tree-zoom');
  const target = element('select'); target.setAttribute('aria-label', '목표 엔딩');
  const spoilerLabel = element('label', undefined, 'tree-spoiler-label'), spoiler = element('input'); spoiler.type = 'checkbox'; spoiler.dataset.treeSpoilers = 'true';
  spoilerLabel.append(spoiler, document.createTextNode('힌트·스포일러 경로 표시'));
  let selected: TreeNode | undefined, goal = '', closed = false;
  const collapsed = new Set<string>();
  function revealAll() { collapsed.clear(); updateLabels(); }
  function visibleNodes() {
    const seen = new Set<string>(['origin']), queue = ['origin'];
    for (const id of queue) if (!collapsed.has(id)) for (const edge of tree.edges.filter(edge=>edge.from===id)) if(!seen.has(edge.to)) { seen.add(edge.to);queue.push(edge.to); }
    return seen;
  }
  let lastSize = { width: 0, height: 0 };
  function publicLabel(node: TreeNode) {
    if (node.type === 'origin') return '0세 · 출생신고';
    if (node.type === 'ending') {
      const index = options.entries.findIndex(entry => entry.id === node.endingId);
      return options.discovered.has(node.endingId!) || spoiler.checked ? options.entries[index]!.title : `미발견 엔딩 ${String(index + 1).padStart(2, '0')}`;
    }
    return `${node.age}세 · ${node.sceneTitle}`;
  }
  function updateLabels() {
    const savedTarget = target.value; target.replaceChildren();
    target.append(new Option('목표 엔딩 선택', ''));
    for (const entry of options.entries) target.append(new Option(publicLabel(byTreeId.get(`ending:${entry.id}`)!), entry.id));
    target.value = savedTarget;
    const visible = visibleNodes();
    const goalNodes = new Set(goal ? spoiler.checked ? tree.routes[goal] : [`ending:${goal}`] : []);
    for (const node of tree.nodes) {
      const open = nodeButtons.get(node.id)!, status = visitStatus(node, options.state);
      const choice = node.type === 'scene' ? `사건 · ${options.story.nodes[node.nodeId!]?.choices.length ?? 0}개 선택${collapsed.has(node.id) ? ' · 접힘' : ''}` : node.type === 'step' ? node.choiceText! : node.type === 'ending' ? (options.discovered.has(node.endingId!) ? '획득한 엔딩' : '잠금') : sourceFor(node) ? '방문한 사건 · 다른 선택 가능' : '';
      open.hidden = !visible.has(node.id);
      open.replaceChildren(element('span', publicLabel(node)), element('small', choice)); open.setAttribute('aria-label', `${publicLabel(node)} ${choice}`);
      open.classList.toggle('is-collected', collected.has(node.id)); open.classList.toggle('is-visited', status.selected); open.classList.toggle('is-target', goalNodes.has(node.id));
      open.classList.toggle('is-dimmed', Boolean(goal) && !goalNodes.has(node.id) && !collected.has(node.id) && !status.selected); open.classList.toggle('is-selected', selected?.id === node.id);
      const dot=miniNodes.get(node.id)!; dot.style.display=visible.has(node.id)?'':'none';
      miniNodes.get(node.id)?.classList.toggle('mini-collected', collected.has(node.id));
      miniNodes.get(node.id)?.classList.toggle('mini-current', status.selected);
      miniNodes.get(node.id)?.classList.toggle('mini-target', goalNodes.has(node.id));
    }
    const goalEdges = new Set(goal && spoiler.checked ? routeEdges(tree.routes[goal] ?? []) : []);
    for (const [key, line] of edgeElements) {
      const [from,to] = key.split('→'); line.style.display=visible.has(from!)&&visible.has(to!)&&!collapsed.has(from!)?'':'none';
      line.classList.toggle('is-collected', collectedEdges.has(key));
      line.classList.toggle('is-visited', currentEdges.has(key));
      line.classList.toggle('is-target', goalEdges.has(key));
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
    const source = sourceFor(node); if (!source) return;
    const question = element('section', undefined, 'tree-resume-confirm'); question.setAttribute('role', 'group'); question.setAttribute('aria-label', '재선택 확인');
    question.append(element('p', `${source === options.state ? '현재 회차' : '이전 회차의 실제 기록'}에서 선택 직전으로 돌아갑니다. 현재 회차를 백업하고 이 사건의 선택 직전부터 이어할까요? 이후 기록은 새 선택에 따라 바뀌며 획득한 엔딩은 유지됩니다.`));
    question.append(button('확인 · 여기부터 재선택', () => { if (sourceFor(node) !== source) return; finish(); options.onResume(node.nodeId!, source === options.state ? undefined : source); }), button('취소', () => question.remove()));
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
        const fork = lastVisitedFork(node.endingId!, options.state) ?? pastRuns.map(run => lastVisitedFork(node.endingId!, run)).find(Boolean);
        if (fork) detail.append(element('p', `다시 선택할 수 있는 마지막 방문 분기: ${fork.age}세 · ${fork.sceneTitle}`), button('방문 분기 보기', () => { center(fork); select(fork); }));
        else detail.append(element('p', '실제 저장 기록에서 이어갈 방문 분기를 찾지 못했습니다. 획득 정보만으로 과거 상태를 복원하지 않습니다.'));
      }
    } else if (node.type === 'scene') {
      const scene=options.story.nodes[node.nodeId!]!;
      detail.append(element('p', visitStatus(node,options.state).selected ? '현재 회차에서 방문한 사건' : sourceFor(node) ? '지난 회차에서 방문한 사건' : '미방문 사건 · 연결은 조건에 따라 달라집니다.'));
      detail.append(element('p',scene.body));
      const list=element('ul'); for(const choice of scene.choices) list.append(element('li',choice.text));detail.append(list);
      detail.append(button(collapsed.has(node.id)?'이 분기 펼치기':'이 분기 접기',()=>{ collapsed.has(node.id)?collapsed.delete(node.id):collapsed.add(node.id);updateLabels();select(node); }));
      const source=sourceFor(node); if(source) detail.append(button(source===options.state?'이 사건부터 재선택':'이전 회차 · 이 사건부터 재선택',()=>confirmResume(node)));
    } else if (node.type === 'step') {
      detail.append(element('p', status.selected ? '이 회차에서 실제 선택한 분기' : sourceFor(node) ? '실제 방문 기록이 있는 사건 · 여기서 다른 선택을 할 수 있습니다.' : collected.has(node.id) ? '수집한 엔딩의 검증 예시 경로' : '이 회차에서 방문하지 않은 분기'));
      {
        const scene = options.story.nodes[node.nodeId!]!, choice = scene.choices.find(choice => choice.id === node.choiceId)!;
        const outcome = choice.outcomes.find(outcome => outcome.id === node.outcomeId)!;
        detail.append(element('p', choice.text), element('p', choice.description ?? ''), element('p', outcome.narrative ?? ''));
        const condition = element('details'), text = element('pre', JSON.stringify({ enabledWhen: choice.enabledWhen, when: outcome.when, weight: outcome.weight }, null, 2));
        condition.append(element('summary', '선택·판정 조건'), text); detail.append(condition);
      }
      const source = sourceFor(node);
      if (source) detail.append(button(source === options.state ? '이 사건부터 재선택' : '이전 회차 · 이 사건부터 재선택', () => confirmResume(node)));
      else if (collected.has(node.id)) detail.append(element('p', '엔딩 획득 정보는 있지만 이 분기의 실제 회차 저장이 없어 여기서 이어할 수 없습니다. 새 회차부터 진행 기록을 별도로 보관합니다.'));
    } else detail.append(element('p', '출생부터 모든 사건·선택·엔딩 연결을 표시합니다. 조건을 무시한 경로 이동이나 트리 조작만으로 엔딩이 해금되지는 않습니다.'));
    detail.focus({ preventScroll: true });
  }
  const find = () => {
    collapsed.clear(); goal = target.value; updateLabels();
    if (!goal) { announcement.textContent = '목표 엔딩을 선택해 주세요.'; return; }
    const node = byTreeId.get(`ending:${goal}`)!; center(node); select(node); announcement.textContent = `${publicLabel(node)} 위치로 이동했습니다.`;
  };
  const enlarge = button('+', () => { camera.zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, 1.25); draw(); }); enlarge.setAttribute('aria-label', '확대');
  const reduce = button('−', () => { camera.zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, .8); draw(); }); reduce.setAttribute('aria-label', '축소');
  const findButton = button('찾기', find); findButton.setAttribute('aria-label', '목표 엔딩 찾기');
  const search=element('input');search.type='search';search.placeholder='사건·선택 검색';search.setAttribute('aria-label','사건·선택 검색');
  let searchIndex=0;
  const searchNext=()=>{
    const term=search.value.trim().toLocaleLowerCase(); if(!term)return;
    const matches=tree.nodes.filter(node=>`${node.id} ${node.type==='ending'?publicLabel(node):`${node.sceneTitle??''} ${node.choiceText??''}`}`.toLocaleLowerCase().includes(term));
    if(!matches.length){announcement.textContent='검색 결과가 없습니다.';return;}
    revealAll();const node=matches[searchIndex++%matches.length]!;center(node);select(node);announcement.textContent=`검색 결과 ${((searchIndex-1)%matches.length)+1}/${matches.length}`;
  };
  search.addEventListener('input',()=>{searchIndex=0;});search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchNext();}});
  const cameraControls=element('div',undefined,'tree-control-group tree-camera-controls');cameraControls.append(button('전체 보기',fit),enlarge,reduce,zoomLabel);
  const targetControls=element('div',undefined,'tree-control-group');targetControls.append(target,findButton);
  const searchControls=element('div',undefined,'tree-control-group');const expandAll=button('펼치기',revealAll);expandAll.setAttribute('aria-label','모두 펼치기');searchControls.append(search,button('검색',searchNext),expandAll);
  controls.append(cameraControls,targetControls,searchControls);
  const closeButton = button('닫기', () => finish()); header.append(heading, closeButton);
  dialog.append(header, controls, spoilerLabel, help, body, announcement);
  spoiler.addEventListener('change', () => { updateLabels(); if (selected) select(selected); });
  const pointers = new Map<number, { x: number; y: number; startX: number; startY: number }>();
  let gestureMoved = false, tapNode: TreeNode | undefined;
  let pinch: { distance: number; scale: number; world: { x: number; y: number } } | undefined;
  function point(event: PointerEvent) { const b = viewport.getBoundingClientRect(); return { x: event.clientX - b.left, y: event.clientY - b.top }; }
  function resetPinch() {
    const [a, b] = [...pointers.values()];
    pinch = a && b ? { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale: camera.scale, world: camera.worldFromScreen((a.x + b.x) / 2, (a.y + b.y) / 2) } : undefined;
  }
  const fromMinimap = (event: Event) => event.target instanceof Node && map.contains(event.target);
  // 터치는 노드에 암묵적으로 캡처된다. 처음부터 지도가 캡처해 이동 중 소유권 변경을 피한다.
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || fromMinimap(event)) return;
    event.preventDefault();
    if (!pointers.size) {
      gestureMoved = false;
      const id = event.target instanceof Element ? event.target.closest<HTMLElement>('.tree-node')?.dataset.treeNode : undefined;
      tapNode = id ? byTreeId.get(id) : undefined;
    }
    const p = point(event); pointers.set(event.pointerId, { ...p, startX: p.x, startY: p.y });
    if (pointers.size > 1) { gestureMoved = true; tapNode = undefined; }
    resetPinch(); viewport.focus({ preventScroll: true });
    try { viewport.setPointerCapture(event.pointerId); } catch { /* 종료된 포인터 */ }
  }, true);
  viewport.addEventListener('pointermove', event => {
    const before = pointers.get(event.pointerId); if (!before) return;
    event.preventDefault(); const p = point(event), wasMoved = gestureMoved;
    if (Math.hypot(p.x - before.startX, p.y - before.startY) > 8 || pointers.size > 1) gestureMoved = true;
    pointers.set(event.pointerId, { ...before, ...p });
    if (!gestureMoved) return;
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      camera.scale = Math.max(camera.minScale, Math.min(camera.maxScale, pinch.scale * Math.hypot(a!.x - b!.x, a!.y - b!.y) / pinch.distance));
      camera.tx = (a!.x + b!.x) / 2 - pinch.world.x * camera.scale; camera.ty = (a!.y + b!.y) / 2 - pinch.world.y * camera.scale;
    } else camera.panBy(p.x - (wasMoved ? before.x : before.startX), p.y - (wasMoved ? before.y : before.startY));
    draw();
  }, true);
  const release = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    const tapped = event.type === 'pointerup' && pointers.size === 1 && !gestureMoved ? tapNode : undefined;
    if (event.type === 'pointercancel') { gestureMoved = true; tapNode = undefined; }
    pointers.delete(event.pointerId); resetPinch();
    try { if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); } catch { /* 이미 해제됨 */ }
    if (!pointers.size) { gestureMoved = false; tapNode = undefined; }
    if (tapped) select(tapped);
  };
  viewport.addEventListener('pointerup', release, true); viewport.addEventListener('pointercancel', release, true);
  viewport.addEventListener('lostpointercapture', event => {
    // 자식 노드의 캡처 해제는 버블링된다. 지도에 남아 있는 정상 포인터를 지우지 않는다.
    if (event.target !== viewport || !pointers.delete(event.pointerId)) return;
    gestureMoved = true; tapNode = undefined; resetPinch();
  });
  // 포인터 탭은 위 pointerup에서 한 번만 처리한다. 키보드/보조기술의 click(detail=0)은 유지한다.
  viewport.addEventListener('click', event => {
    if (event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  viewport.addEventListener('wheel', event => { event.preventDefault(); const b = viewport.getBoundingClientRect(); camera.zoomAt(event.clientX - b.left, event.clientY - b.top, Math.exp(-Math.max(-300, Math.min(300, event.deltaY)) * .002)); draw(); }, { passive: false, capture: true });
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
    if (closed) return; closed = true; observer.disconnect(); pointers.clear();
    window.removeEventListener('popstate', onPop); dialog.close(); dialog.remove();
    if (pop && history.state?.endingTreeToken === token) history.back();
    options.opener.focus({ preventScroll: true }); options.onClose();
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  document.body.append(dialog); dialog.showModal(); updateLabels(); fit(); lastSize = { width: viewport.clientWidth, height: viewport.clientHeight };
  observer.observe(viewport); history.pushState({ ...history.state, endingTreeToken: token }, ''); window.addEventListener('popstate', onPop); closeButton.focus();
  return () => finish();
}
