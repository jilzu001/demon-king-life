# Codex 적용 지침 v3.6

1. 기존 프로젝트와 ZIP의 스키마/파일 차이를 먼저 검사하고 백업 또는 커밋 확보.
2. `content/events_v2_9.json`에서 이번에 변경된 6개 사건의 choice result/resultParagraphs만 우선 안전하게 병합. 현재 게임의 65개 사건/기존 ID/조건/effects 보존.
3. `assets/assets.json` 신규 항목 및 `assets/illustrations/event_cg/mina_wooden_sword.webp`를 통합. 기존 자산 경로 보호.
4. `assets/main_screen_illustration_policy.json`, `assets/scene_illustration_overrides_v3_6.json`, `ENGINE_IMPROVEMENT_V3_6.md` 확인하여 엔진 코드에 이미지 선택·원본 크기 상한을 구현. 문서만 복사하고 구현했다고 보고하지 말 것.
5. 신규 일러스트는 정확히 맞는 나무칼 장면에만 사용하고, 다른 미나 사건에는 잘못 배치하지 말 것.
6. 개발 기록은 기존 AGENTS.md/DEV_PROGRESS.md/CHANGELOG.md와 충돌 없이 갱신. WRITING_PROGRESS.md는 실제 변경 ID와 대조.
7. 기존 기능 회귀 테스트: 선택 분기, 세이브 로드, 연령 진행, 엔딩, 회차 해금, 반응형, 이미지 미존재 폴백.
8. 완료/실패/미검증 결과를 구분해 보고.

이 ZIP은 콘텐츠/자산/적용 지침 패키지이며 기존 게임의 런타임 코드에 대한 직접 패치가 아니다.
