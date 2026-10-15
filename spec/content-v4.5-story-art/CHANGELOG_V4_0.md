# CHANGELOG v4.0 — 누적 집필 품질 반복 보완

**Base**: v3.9 · 전체 16 핵심 / 65 확장 / 8 엔딩 유지

- 본문 집필 변경 **41개 확장 사건** / 결과 **26개 선택지** / **8개 엔딩 전면 재집필**
- 이전 콜백 24개에서 58개로 확장 (**+34개** 집필)
- 조건 보완: `prison_library` / `prison_cellmate` / `prison_meal`은 `attacked_mina` 필요; `bread_union`은 `bakery_opened` 필요
- 상태 추가: `hearing.walk_away`, `settlement.take_money` 선택에서 `bakery_opened`
- 끊어진 해금 조건: `unlock_roen_guard`의 `ending_execution` → 실제 존재하는 `ending_throne`
- 고령 이벤트 연령 범위 조정: `king_apology`, `last_audit`, `hospital_name`을 61~65세로 변경
- `ending_love_scandal`의 누락된 엔딩 시네마틱 추가
- WebP 일러스트 **56개 모두 바이트 동일** (이번 수정은 집필 중심)
- `audit/validate_v4_0.py` 통과. 실제 웹게임 플레이 테스트는 미수행.

**주의:** 새 콜백 텍스트가 JSON에 포함됐다고 게임에 자동 표시되는 것은 아니다. Codex가 엔진과 연결해야 한다.
