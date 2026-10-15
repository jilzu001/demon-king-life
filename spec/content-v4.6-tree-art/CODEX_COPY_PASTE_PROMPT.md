# 코덱스에 그대로 복붙

기준 저장소는 `jilzu001/demon-king-life`의 현재 `main`이다. 첨부된 `demon_king_v4_6_tree_art_handoff.zip`을 작업 폴더에 풀고 `README_FIRST.md`부터 읽어라. 사용자 승인 사항: **도감 전용 분기 트리·미니맵 도입**과 **사용자가 승인한 출생신고 장면을 기준으로 구형 일러스트·초상화 전면 교체**. 기존 게임 본문 UI 리디자인은 취소 상태이므로 진행하지 마라.

진행 절차:

1) 저장소의 `AGENTS.md`, `CANON.md`, `CONTENT_CANON.md`, `DEV_PROGRESS.md`, `WRITING_PROGRESS.md`, `src/ui/ending-gallery.ts`, `src/content/ending-gallery.ts`, `src/app/main.ts`, `src/styles/main.css`, `src/persistence/reselect.ts`, `docs/v4.5/actual-ending-paths.json`을 확인하고 `git status --short`로 사용자 변경 사항을 보존해라. 작업 브랜치 생성.

2) 현재 엔딩 도감에만 `분기 트리 보기` 버튼을 추가한다. 도감에서 열리는 전체 화면 트리 뷰어에 PC 드래그·휠 확대, 모바일 한 손가락 이동·두 손가락 핀치, 노드 클릭 사건 상세, 확대/축소/전체맞춤/엔딩 찾기, **우하단 미니맵과 현재 화면 표시 사각형 및 미니맵 탭/드래그 이동**을 구현해라. 화면을 드래그해도 노드의 그래프 좌표는 바뀌지 않고 카메라 pan/zoom만 바뀐다. 기존 HUD·본문·스크롤/페이지 방식·도감 목록 레이아웃은 변경하지 마라. 닫기/ESC/뒤로가기에 복귀와 포커스 복원을 지원해라.

3) ZIP의 `scripts/tree-camera.mjs`를 카메라·미니맵 수학 구현 참고로 사용해라(단위 테스트 4개 통과). `scripts/generate-ending-tree.mjs`를 먼저 현재 저장소에서 실행해 `docs/v4.5/actual-ending-paths.json`에서 검증된 20개 엔딩 실제 선택 경로를 트리 형태로 생성해라. 해당 결과의 20/20 도달 경로 검증 및 `scripts/validate-tree.mjs` 확인. 한 엔딩당 한 가지 실제 수집용 예시 경로의 prefix 트리임을 UI에 표시하고, 존재하지 않는 분기를 추측해서 그리지 마라. 실제 제목·텍스트·선택 결과는 저장소의 현행 Story 데이터를 따른다. 나이별 연간 한 문장 기록 325개는 강제 선택 노드로 만들지 마라.

4) 미해금 엔딩은 기본적으로 번호/물음표만 보이고 제목·결말·이미지 URL은 DOM/초기 요청에서 숨겨라. 유저가 별도로 `힌트/스포일러 경로 보기`를 켠 경우에만 자세한 선택 가이드를 표시해라. 현재 회차 `state.history`에 실제 기록된 노드만 강조하고, 목표 엔딩 경로와 비교해 `다시 선택할 수 있는 마지막 방문 분기`를 안내해라. 트리 클릭만으로 엔딩 해금이나 상태 변경은 절대 금지. 재선택은 기존 보호 함수와 명시 확인을 통해 실제 방문했던 사건에서만 허용.

5) 이미지 전면 개편: `assets/style_reference/APPROVED_birth_reference.webp`를 **최종 그림체 기준**으로 고정. 이것은 기존 게임 스크린샷의 0세 그림과 동일한 정사 원화다. 이 장면에는 부모(갈색 머리 평민 남녀), 검은 머리 아기, 안경 서기관만 등장한다. 미나(은빛 긴 머리·푸른 눈)는 아기의 어머니가 아니며 성인 주인공은 아버지가 아니다. 빨간 머리 레온은 미나와 다른 사람이다. 사용자가 반복 거부한 과밀 군중·은발 엄마·성인 주인공 아빠 그림은 재사용 불가.

6) `docs/02_PORTRAIT_PROMPTS.md`, `docs/03_EVENT_PROMPTS.md`, `docs/04_ENDING_PROMPTS_20.md`를 캐릭터별/실제 사건별/엔딩 20개별 생성 프롬프트로 사용해라. 먼저 라이브 저장소 이미지 인벤토리(`public/art/portraits`, `public/assets/illustrations/characters`, events, event_cg, endings, flashbacks, backgrounds)와 `src/ui/portraits.ts`, `src/ui/visual-identity.ts`, `src/ui/illustrations.ts`, 이미지 manifest를 전수 확인하고, 교체 표를 만들어라. 기존 구형 일러스트·초상화는 승인된 그림체로 **실제 전면 교체 대상**이지 보존 지시가 아니다. 다만 **대체 원화가 실재하고 시각 검증을 통과한 것부터 교체**하고, 원화 없이 파일 삭제/가짜 복붙/무관한 이미지 매핑을 하지 마라. 외부 이미지 생성 수단이 없다면 해당 항목은 `미제작`으로 남겨 정확한 제작 요청 프롬프트를 제공해라.

7) 모두 Pages 친화적 저용량 WebP로 제공. 권장 이벤트/엔딩 800~1100px, 초상화 480~640px, 품질 65~80을 테스트하고 크기/얼굴/색상 일관성을 확인해라. UI 장식용 작은 아이콘은 전면 리디자인 대상이 아니다. 20개 엔딩 도감의 잠금·실제 획득 이미지는 유지. 사건 CG는 실제 node/age/choiceId/outcomeId/flags와 연결하고 다른 경로에서 부적절하게 등장하지 않게 해라.

8) 반드시 `npm run typecheck`, `npm test`, `npm run validate:content`, `npm run simulate:all`, Playwright PC·모바일 관련 테스트, 최종 `npm run check`를 수행해라. 트리 20 엔딩 실제 경로, 미니맵/핀치/노드 탭, 저장/재선택/스포일러 잠금 회귀, 이미지 404/바이트/비율 등을 검증. `DEV_PROGRESS.md`/`CHANGELOG.md` 업데이트. **실제 완료된 코드·그림 개수와 미완료·미검증 항목**을 구분해 한국어로 보고해라. 이번 ZIP 자체는 완성된 게임이 아니라 적용 자료이며, GitHub에는 아직 변경하지 않았다.
