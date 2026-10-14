# 집필 진행 기록

기준일: 2026-10-14. 대상은 [v3.4 입력의 확장 사건 파일](spec/content-v3.4-illustrated/content/events_v2_9.json) **65개 사건**이다. 별도16개 핵심 사건/현재 공개13개 사건/보관 원작98개 사건은 이 분모에 합산하지 않는다. 게임 적용 상태는 [DEV_PROGRESS.md](DEV_PROGRESS.md)에서 관리한다.

## 초기 집계와 확인 수준

| 항목 | 초기 기준 | 확인 수준 |
| --- | --- | --- |
| 전체 사건 | 65개 | JSON65개·고유 ID65개·선택195개 확인 |
| 집중 집필 완료 | **22개 (33.8%)** | 사용자 제공 총계; ID별 근거 확인15개 + 추가7개 미확정 |
| 추가 보완 대상 | **43개** | 사용자 제공 총계; 개별43개 ID는 아직 확정하지 않음 |
| ID 분류 보류 | 50개 | 완료7개와 보완43개가 포함되는 후보 집합;50개 전부를 미완료로 표기하지 않음 |

사용자는 추가 완료7개의 ID를 모른다고 답했다. **22/65는 유지할 초기 집계이며22개 ID가 모두 검증됐다는 의미가 아니다.** 새 정보 전까지 나머지7개를 추측으로 골라 채우거나 진행률을15/65로 바꾸지 않는다. 자료 미확정과 추가 집필 필요는 구분한다.

## 완료 근거 확인15개

- 기존3개: `unlock_marta_ledger`, `conditional_mina_apology`, `unlock_roen_guard`. [v3.2 보고서](spec/content-v3.4-illustrated/AUTHORING_REPORT_V3_2.json)의 기존집필3개, 작업 브랜치에 보존된 v2.9 원본3개 ID/본문/선택 결과와 대조했다.
- v3.1 집중 재집필9개: [보고서](spec/content-v3.4-illustrated/AUTHORING_REPORT_V3_1.json)의 rewrittenIds와 JSON의 authoredRevision을 대조했다.
- v3.3 재집필3개: [보고서](spec/content-v3.4-illustrated/AUTHORING_REPORT_V3_3.json)의 first_wage/queen_letter/new_demon과 JSON의 authoringPass를 대조했다.

이15개는 **집필 자료의 근거 확인**이다. 실제 게임의 사건 연동/도달/문학적 최종 검수 완료를 뜻하지 않는다. 현재 공개 앱에는65개 확장 사건이 아직 연결되지 않았다.

[v3.2의65개 authored-or-expanded 보고](spec/content-v3.4-illustrated/CODEX_AUTHORING_V3_2.md)는 본문 보강을 포함한다. expanded_v3_2 표시, 문단 수·글자 수, JSON/스키마 통과만으로 집중 집필 완료를 늘리지 않는다. v3.3는3개만 다시 집필했다고 명시한다.

## 사건 ID별 현황

| 사건 ID | 제목 | 집필 상태 | 근거 |
| --- | --- | --- | --- |
| `unlock_marta_ledger` | 여관 주인이 기억하는 손님 | 완료 근거 확인 | 기존 집필3개·v3.2 보존 보고 |
| `conditional_mina_apology` | 용사의 사과는 늦게 온다 | 완료 근거 확인 | 기존 집필3개·v3.2 보존 보고 |
| `unlock_roen_guard` | 처형 명령서의 빈칸 | 완료 근거 확인 | 기존 집필3개·v3.2 보존 보고 |
| `birth_tax` | 여섯 살의 납세 고지서 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `village_well` | 우물 속에 빠진 마왕의 위엄 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `school_map` | 지도에서 지워진 집 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `first_wage` | 첫 월급과 적국 근로자 | 완료 근거 확인 | v3.3 rewrittenInThisPass·authoringPass |
| `royal_portrait` | 마왕 심사장 초상화 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `guard_toll` | 성문에서 받는 입장료 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `mina_festival` | 축제의 용사와 마왕 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `herald` | 왕국 방송의 오보 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `prison_library` | 교도소 도서관의 금서 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `prison_cellmate` | 옆방의 전직 예언자 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `prison_meal` | 마왕 특별식 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `village_boycott` | 마왕 빵집 불매운동 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `mina_medal` | 미나의 훈장 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `apprentice` | 제자가 되겠다는 소년 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `palace_dinner` | 왕궁 만찬의 독배 | 완료 근거 확인 | v3.1 rewrittenIds·authoredRevision |
| `royal_garden` | 왕실 정원의 금지 표지 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `king_tea` | 국왕의 차 한 잔 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `queen_letter` | 왕비의 봉인된 편지 | 완료 근거 확인 | v3.3 rewrittenInThisPass·authoringPass |
| `queen_heir` | 왕비의 후계자 수업 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `noble_vote` | 47표의 왕위 계승 투표 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `wedding_contract` | 혼인 계약서의 작은 글씨 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `mina_bridge` | 다리 위의 오래된 친구 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `court_jester` | 궁정 광대의 실직 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `palace_fire` | 왕궁 화재와 구출 명단 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `tax_rebellion` | 마을 세금 폭동 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `fake_awaken` | 마왕 각성 의식 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `birth_archive` | 출생기록 보관소 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `ledger_copy` | 장부의 두 번째 필체 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `audit_witness` | 사라진 감사관 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `army_budget` | 병사들의 낡은 장화 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `king_speech` | 국왕의 대국민 연설 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `queen_audit` | 왕비의 비밀 회계사 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `hero_union` | 용사 노동조합 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `ministry_shred` | 파쇄기의 밤 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `court_lawyer` | 국선 변호인의 사직서 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `royal_press` | 왕실 기자회견 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `old_friend` | 미나의 첫 은퇴 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `orphan_registry` | 또 다른 마왕 아이 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `public_memorial` | 국가 피해자 추모비 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `retired_king` | 퇴위한 왕의 작은 집 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `princess_coronation` | 에리시아의 대관식 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `village_election` | 마을 촌장 선거 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `bread_union` | 빵집 노동자의 파업 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `statue` | 마왕 동상 제막식 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `old_mina` | 미나의 낡은 검 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `ledger_trial` | 숫자 뒤의 이름들 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `guard_daughter` | 근위병의 딸 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `royal_archive_open` | 왕실 기록관의 개방일 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `marta_funeral` | 마르타의 마지막 장부 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `veteran_pension` | 전쟁에 나가지 않은 참전용사 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `child_history` | 교과서 속의 당신 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `peace_treaty` | 존재하지 않는 나라와 평화협정 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `mina_reunion` | 동창회의 빈 의자 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `grandchild_question` | 아이의 무례한 질문 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `king_apology` | 왕의 사과 연습 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `last_audit` | 마지막 미지급금 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `hospital_name` | 병원 접수창구의 직업란 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `secret_child` | 왕궁의 이름 없는 아이 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `false_prophecy` | 가짜 예언을 파는 상인 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `enemy_diplomat` | 적국 외교관의 실체 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |
| `new_demon` | 두 번째 국가 지정 마왕 | 완료 근거 확인 | v3.3 rewrittenInThisPass·authoringPass |
| `court_ghost` | 서류실의 유령 | 완료/보완 미확정 | v3.2 보강 표시만 확인 |

## 새 자료 반영 규칙

1. 같은 사건 ID의 기존 본문/각 선택 결과와 새 자료·집필 보고서를 대조하고 해당 행의 상태/근거를 갱신한다. 새 ID는 임의 추가하거나 기존 선택/효과를 덮어쓰지 않는다.
2. 추가7개가 확인되면 위50개 후보에서 해당 ID만 완료로 확정하고, 나머지43개의 보완 내역을 확정한다. 자료가 초기 총계와 다르면 차이/근거를 기록하며 조용히 숫자를 맞추지 않는다.
3. 재집필은 같은 ID의 이력을 갱신하며 중복 완료로 집계하지 않는다. 실제 보완이 완료될 때만 완료 수/남은 수/완료율을 함께 갱신한다.
4. 집필률, 게임 적용 상태, 실제 플레이 검수는 별도 관리한다. 기록 규칙은 [AGENTS.md](AGENTS.md)를 따른다.

## 최근 확인 — 2026-10-14

- 집필/콘텐츠 수정 없음. 원본 보고서·65개 ID·기존3개 본문/선택 결과·v3.1/v3.3 표식을 확인해 초기 기록만 작성했다.
- 정적 문단 대조:65개 bodyParagraphs와 body,195개 resultParagraphs와 result 및 존재하는 resultNarrative가 일치했다. 이는 문단 데이터 확인이며 엔진 적용/작품 품질 검사로 계산하지 않는다.
- 사용자 답변: 추가7개 ID는 알 수 없음. 추후 GPT 집필 자료 등 새 정보가 오면 위 규칙으로 대조/반영한다. 추가 확인 질문을 반복하지 않는다.
