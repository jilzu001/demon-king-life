# 마왕 게임 개발 명세 패키지 v1.0

- `DEVELOPMENT_SPEC.md`: 코덱스 구현 기준이 되는 전체 개발 명세서
- `CODEX_HANDOFF.md`: 코덱스에 복사할 첫 작업 지시
- `CANON.md`: 정식 세계관 관리 규칙과 기존 서사 모순 주의점
- `examples/story.json`: 독립 실행 가능한 소형 테스트 시나리오의 매니페스트
- `examples/chapters/01-example.json`: 8개 장면/16개 선택 JSON
- `examples/characters.json`: 등장인물 데이터
- `examples/endings.json`: 5개 엔딩 데이터
- `examples/VERIFICATION_REPORT.txt`: 소형 예제 상태 기반 경로 탐색 결과
- `schemas/*.schema.json`: JSON 스키마 네 종류(구조 검사); 모든 의미적 무결성은 별도 TypeScript 검증기가 담당

**중요:** 이 패키지는 명세와 테스트용 예제만 포함하며, 실행 가능한 웹앱 소스나 마왕 전체 스토리 완성본은 포함하지 않습니다. 코덱스에서는 먼저 `CODEX_HANDOFF.md`의 Phase 1을 구현하세요.
