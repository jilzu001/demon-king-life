# 엔딩 도감 트리 + 미니맵 구현 명세 (실제 저장소 대응)

## 저장소 실제 확인 사항

- 기준 GitHub: `jilzu001/demon-king-life`, 기본 브랜치 `main`.
- 현재 엔딩 도감: `src/ui/ending-gallery.ts`, `src/content/ending-gallery.ts`, `src/app/main.ts`, `src/styles/main.css`.
- 현재 정사 스토리: `public/stories/demon-king-compact/story.json`; chapters 01, 02, 03 누적. 현재 공식 엔딩 **20개**.
- **최신 실제 완주 20개 샘플**: `docs/v4.5/actual-ending-paths.json`; 구형 `docs/v4.4/routes/actual-paths.json`을 우선하지 않는다.
- 저장 원장: `GameState.history` 안의 `{age,nodeId,choiceId,outcomeId,toKind,toId}`, `Meta.discoveredEndings`. 이 기록은 읽기 전용.
- 엔딩 잠금 정책: `renderEndingGallery`는 미해금 항목의 제목/전체 본문/이미지 URL을 DOM에 넣지 않는다. 동일하게 유지.
- `src/persistence/reselect.ts` 기존 방문 사건 재선택 도구 재사용. 미방문 사건으로의 이동과 엔딩 자동 해금 불허.

## 사용 시나리오

기존 `엔딩 도감` 목록에 `분기 트리 보기` 버튼 1개만 추가. 버튼 클릭 시 **도감 안에서만 별도 전체 화면 오버레이**를 표시한다. 전체 게임 화면/메인 HUD/본문/페이지·스크롤·스토리 엔진 UI는 변경하지 않는다. 닫으면 기존 도감 위치와 포커스 복원.

- PC: 빈 배경 드래그로 카메라 이동, 휠로 마우스 위치 중심 확대/축소, 노드 클릭으로 상세 패널.
- 모바일: 한 손가락 드래그, 두 손가락 핀치 확대/축소, 노드 탭으로 상세. 제스처로 **노드 자체 위치를 절대 변경하지 않는다**.
- 미니맵(우하단): 전체 그래프 축소 지도에 현재 보이는 사각형 표시. 지도 안 탭/드래그로 해당 구역 중심 이동, 확대 수준은 유지. 전체 보기/+/−/찾기/닫기 버튼.
- 노드 클릭: 사건명·나이·결과/조건(공개 가능한 범위)·내 방문/선택 여부 표시. **재선택은 방문 기록이 있는 사건에서만** 기존 보호 함수를 통해 확인 후 실행.
- 미획득 엔딩: 기본 화면에서는 `미발견 엔딩 09`처럼 익명. 사용자가 명시적으로 `획득 힌트 보기` 또는 `스포일러 경로 표시`를 켰을 때만 선택 순서 노출. 기본은 false; 다시 열 때도 false.
- 루트: 엔딩별 한 가지 **검증된 수집용 예시 경로**를 표시하는 prefix trie. 실제 전체 가능한 모든 분기를 보여주는 완전한 게임 상태 그래프라고 주장하지 않는다. 원하면 별도 전체 상태 그래프는 성능/명료성 검토 후 추후 도입.
- 목표 엔딩 선택: 목표 엔딩 경로만 강조, 기타 분기 흐리게, `내 방문 선택 경로`와 비교하여 공통 마지막 방문 분기 제안. 현재 회차와 과거 해금 기록은 구분.
- 범위: 약 20엔딩/수십 개 노드/실제 path 길이. 바뀐 콘텐츠는 제공된 빌드 스크립트 실행으로 재생성.

## 렌더링 설계

`renderEndingTreeViewer`를 새로운 독립 모듈 `src/ui/ending-tree.ts`로 구현하거나 동등 구조 채택. 그래프 데이터는 `scripts/generate-ending-tree.mjs` 실행으로 생성한 `data/ending-tree.generated.json`을 앱 빌드에 포함. 사용자가 실제 repo에서 script 실행·데이터 갱신. SVG 선 + HTML 절대 위치 노드 또는 통합 SVG 사용. 화면 변환은 카메라 `x,y,scale`에만 적용. 그래프 레이아웃은 결정론적이어야 하며 선택·진행 플래그로 임의로 달라지지 않는다.

### 좌표계·미니맵

- 노드 좌표는 그래프 world 좌표로 유지. `screenX=worldX*scale+tx`, `screenY=worldY*scale+ty`로 변환하고 CSS `translate(tx,ty) scale(scale)`와 일치시킨다. `scripts/tree-camera.mjs`의 검증된 수학을 참고한다.
- 전체 content bounds(min,max)와 viewport 실제 크기를 이용해 축소 미니맵 transform을 계산. 본 화면의 보이는 영역은 inverse transform으로 world rect 환산하여 미니맵에 표시. 노드 수와 배율과 무관하게 위치 정확해야 한다.
- scale 예: 0.35~2.2, 줌은 포인터 아래 world 좌표 고정. fit-to-view는 viewport 크기 바뀌면 재계산. 화면 리사이즈 후 현재 타깃 노드가 가급적 가시 영역에 유지.
- `pointerdown` 후 이동이 7~10px 이상일 때 drag로 확정; 그렇지 않으면 node click 처리. 노드 drag 없음. 모든 포인터 capture/release 안전하게 관리. 모바일 뷰어 영역에 `touch-action:none`, 바깥 본문 스크롤 정상.
- wheel 이벤트는 트리 viewport가 열린 동안에만 `preventDefault`, passive:false. 바깥 화면에서는 사이트 기본 스크롤 영향 없음.
- 접근성: 노드 `button`, 44px 터치 타깃, 적절한 한국어 aria-label, Tab/Enter/Space/Escape, 키보드 +/-와 방향키·전체보기 버튼. 스크린리더용 엔딩/경로 텍스트 목록 보조 제공.
- 이벤트 리스너·ResizeObserver는 뷰어 close/dispose 때 정리. 반복 열닫기에도 중복 이벤트/저장소 쓰기 없어야 한다.

## 기존 데이터 보호

시각화는 `story.nodes`/`story.endings`와 `Meta.discoveredEndings`, 현재 `state.history`만 읽는다. 데이터를 수정해 특정 엔딩을 잠금 해제하지 않는다. `GameState`, 세이브 버전, 원장, RNG, 엔딩 ID, 조건, 효과, 선택 ID, 본문·선택지·나이·대사 변경 금지. 목표 엔딩 선택은 화면용 로컬 상태이고 게임 선택이 아니다.

## 적용 파일 예상

- 추가: `src/ui/ending-tree.ts`, `src/ui/ending-tree-layout.ts` 또는 동일 기능 코드, `src/styles/ending-tree.css`, 생성 그래프 JSON, 단위/Playwright 테스트.
- 최소 수정: `src/ui/ending-gallery.ts`에 버튼, `src/app/main.ts` 메뉴 열닫기 상태/기존 갤러리와 연결, 빌드 검증 스크립트, `DEV_PROGRESS.md`/`CHANGELOG.md`.
- 일러스트 변경은 별도 커밋·별도 QA. 그림 파일을 없앤 채 manifest만 바꾸지 않는다.

## 반드시 검증

1. 공식 20 엔딩마다 실제 샘플 경로가 하나씩 존재하고 마지막 destination이 해당 엔딩인지 체크.
2. 선택 ID/outcome ID가 현재 chapter 데이터와 일치하는지 체크. 누락이 있으면 무조건 중단하고 숨김/추측 경로를 만들지 않는다.
3. 단말 너비 320/360/390/430 및 데스크톱에서 PAN/ZOOM/핀치/미니맵 클릭/맞춤/탐색/닫기 검사.
4. 노드 탭은 선택지 실행이 아니며, 재선택은 과거 방문한 지점+사용자의 명시 확인이 필요.
5. 아직 획득하지 않은 엔딩의 제목·원화 URL·전체 결말은 기본 DOM/미리 로드에 없음.
6. `npm run typecheck`, `npm test`, `npm run validate:content`, `npm run simulate:all`, 관련 Playwright, 최종 `npm run check`.
7. 저장소 배포는 이 ZIP 제작 과정에서 하지 않았다. 코덱스가 검증 후 별도 PR/배포 단계로 처리.
