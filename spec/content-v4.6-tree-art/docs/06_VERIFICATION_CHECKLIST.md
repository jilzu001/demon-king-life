# 적용 QA 체크리스트

[ ] `git status --short` 및 실행 판 기준 commit 확인, 사전 백업/작업 브랜치 생성.
[ ] `AGENTS.md`, `CANON.md`, `CONTENT_CANON.md`, `DEV_PROGRESS.md` 우선 확인.
[ ] `node <ZIP>/scripts/generate-ending-tree.mjs <repo-root> <output>`로 실제 20엔딩 추천 경로 생성 및 유효성 검사.
[ ] 도감 열기/트리 버튼/닫기 및 원래 위치 복귀 확인. 기존 본문 화면 불변.
[ ] 마우스 빈 공간 drag, wheel zoom pointer anchor, 버튼 zoom/fit/target 검색.
[ ] 모바일 터치 drag, pinch, node tap 판별, minimap pan/viewport rect.
[ ] 미해금 제목/본문/그림 URL 기본 DOM에 안 나타남. 스포일러 토글 기본 off.
[ ] 방문 기록 없는 노드에서 재선택 불가; 방문 기록은 확인 후 기존 함수를 사용.
[ ] 현재 회차 `state.history`/`GameState`와 `Meta`가 트리 클릭 전후 동일.
[ ] 승인 0세 원화 복원/유지. 엄마=미나, 아빠=성인 주인공 그림 없음.
[ ] 캐릭터/사건/20엔딩/주마등 개별 manifest와 실제 이미지 1:1 정합성.
[ ] 새 WebP의 정해진 사용 조건, 한 그림의 잘못된 분기 재사용 없음.
[ ] 이미지 404/깨짐/비율·잘림/폰트 text 과다/파일 크기 확인.
[ ] `npm run typecheck`, `npm test`, `npm run validate:content`, `npm run simulate:all`, `npm run check`.
[ ] PC/모바일(320,360,390,430px) 브라우저·GitHub Pages 서브경로·티스토리 내장 환경 검증 범위 구분.
[ ] 수정 파일 목록/테스트/미완료 이미지 수/이미지 바이트 총량/작업 커밋을 한국어로 보고.
