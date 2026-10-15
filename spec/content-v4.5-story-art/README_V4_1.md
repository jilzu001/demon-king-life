# 《가짜 마왕의 일생》 v4.1 — 1세마다 일상 연결 (누적 통합본)

v4.0의 모든 파일을 보존하고 `content/annual_life_events_v4_1.json`(65개)과 `content/annual_memory_callbacks_v4_1.json`(26개)을 추가했다.

**게임 엔진 반영은 아직 수행되지 않았음.** 일정 수준까지 집필 작업을 누적한 후 Codex에 한 번에 넘길 수 있다.

## 목표
기존 코어 나이 점프(0→12→20→21→29→41→47→60/62/65)를 “내용 없는 해”가 없도록 메운다.

- 0세: 기존 출생 사건
- 1~65세: 연도별 일상 65개(특정 나이 전용·범용 구분), **최소 두 선택지** 및 각기 다른 결과
- 큰 사건이 있는 해: 기존 사건 우선, 추가 일상 강요 안 함
- 비어 있는 해: 전용 일상 우선, 없으면 범용 일상
- 플래그 조건의 26개 회상 연결로 과거 일상 선택이 수십 년 뒤에도 한두 문장으로 돌아올 수 있음
- 별도 이미지를 억지로 넣거나 기존 자산을 수정하지 않음

## 파일
- `content/annual_life_events_v4_1.json` — `layer:"annual"` 새로운 레지스트리; 기존 `content/events_v2_9.json`와 무작정 concat 하지 말 것
- `content/annual_generic_pool_v4_1.json` — 재플레이 범용 일상 후보 12개; 지정된 generic 연령만 교체
- `content/annual_memory_callbacks_v4_1.json` — 신규 26개 조건부 후속 회상 초안 (실제 연결 필요)
- `CODEX_ANNUAL_TIMELINE_V4_1.md` — 엔진 통합 명세 및 테스트 루트
- `audit/validate_v4_1.py` — 데이터 정적 검사 (기존 `validate_v4_0.py` 포함)
- `WRITING_PROGRESS.md`, `CHANGELOG_V4_1.md` — 누적 작업 기록

## 주의
- 81개 기존 사건이나 연출을 임의로 변경하지 않음. 이미 존재하는 코어/조건 사건이 해당 연도에 나타났다면 annual 이벤트는 삽입하지 않는다.
- `story.json`의 `initialState.age`와 시작 핵심 노드 연령이 서로 다르므로 엔진 실제 연결 시 조사해야 한다.
- 엔딩 나이를 늘리거나 조기 사망 뒤에 일상을 생성하지 않는다.
