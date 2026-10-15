# 《가짜 마왕의 일생》 v4.6 엔딩 트리 + 이미지 전면 교체 코덱스 전달팩

## 먼저 읽기

사용자가 최종 승인한 그래픽 기준은 **부모·아기·안경 서기관 4명**이 한 행정실에 있는 0세 출생신고 원화이며, `assets/style_reference/APPROVED_birth_reference.webp`에 담았다. 상반신 잘라붙인 초상화/상황이 맞지 않는 합성 그림을 사건 CG로 넣지 마라.

사용자는 **기존 게임 메인 UI 전면 개편을 취소**했지만, **엔딩 도감 안에만 트리 뷰어 + 우하단 미니맵**을 추가하도록 승인했다.

## 패키지 실제 포함

- `CODEX_COPY_PASTE_PROMPT.md`: 코덱스에 넣을 전체 지시문
- `docs/01_TREE_SPEC.md`: 드래그/확대/핀치/미니맵/재선택/스포일러 안전 설계
- `scripts/generate-ending-tree.mjs`: 라이브 GitHub 프로젝트의 **최신 `docs/v4.5/actual-ending-paths.json`** 20개 경로와 현재 Story chapters를 검증해 prefix 트리를 생성하는 실행 가능한 Node 스크립트
- `scripts/validate-tree.mjs`: 생성된 20경로 트리 구조 검사
- `scripts/tree-camera.mjs` + `tree-camera.test.mjs`: 카메라 팬/줌/전체 맞춤, 미니맵 변환식의 독립 코드 및 **Node 단위 4개 테스트 통과**
- `docs/02_PORTRAIT_PROMPTS.md`: 인물 원형·감정별 독립 초상화 작업 지침
- `docs/03_EVENT_PROMPTS.md`: 정사 기반 사건 일러스트 제작 프롬프트 (0세, 12세, 20세, 21세, 29세, 41세, 47세 등)
- `docs/04_ENDING_PROMPTS_20.md`: **공식 20개 엔딩 전용** 일러스트 프롬프트
- `docs/05_ART_REPLACEMENT_POLICY.md`: 구형 이미지 전면 교체 계획과 오류 방지/QA/저용량 규칙
- `data/legacy_asset_inventory_v45.csv`: 이전 v4.5 ZIP의 실재 71개 WebP 재고 목록(현재 GitHub 전수 목록 아님)
- `assets/style_reference/APPROVED_birth_reference.webp`: 사용자 승인 원화의 126KB WebP 고해상 화풍 앵커
- `assets/style_reference/APPROVED_birth_960.webp`: 동일 원화의 80KB 게임용 크기 후보
- `assets/style_reference/APPROVED_user_crop.webp`: 사용자 화면 캡처의 15KB 스타일 앵커

## 이 ZIP이 아직 포함하지 않는 것

- **전체 구형 그림을 교체할 신규 완성 원화 수십/수백 장은 포함되어 있지 않다.** 사용자가 거부한 오류 그림을 억지로 넣거나, 아직 그리지 않은 자산을 '완료'로 표기하지 않는다.
- 엔딩 트리를 게임 저장소에 직접 적용한 구현 코드가 아니다. 코덱스가 실행 가능한 생성 스크립트와 본 프로젝트 소스에 맞춘 상세 설계를 이용해 실제 구현한다.
- GitHub `main`에 커밋/푸시하지 않았다. 작업 브랜치에서 적용·테스트 후 사용자 작업 흐름대로 배포한다.

## 제일 먼저 해야 할 일

1. `CODEX_COPY_PASTE_PROMPT.md` 및 프로젝트 `AGENTS.md` 읽기.
2. Node 22+ 준비 및 `node <unzip>/scripts/generate-ending-tree.mjs <repo-root>` 실행.
3. `node <unzip>/scripts/validate-tree.mjs <repo-root>/src/content/generated/ending-tree.json` 실행.
4. `docs/01_TREE_SPEC.md`에 맞게 트리 뷰어 구현.
5. 그림 전수 인벤토리 및 단계별 실제 원화 제작/교체.
6. 테스트 완료 내역과 미완료 이미지 목록 투명하게 보고.
