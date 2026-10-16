# v5.0 자유 재집필 적용·검증 기록

이 문서는 첫 v5.0 콘텐츠 전환 기준 기록이다. 9c49c36/Actions38868651942에서 전체 검사·배포가 완료됐다. 이후 추가된 CG48개와 연간 일상·제목 오기1곳은 [최신 통합 기록](ART_AND_DAILY_UPDATE.md)을 우선한다.

## 적용 및 보호

- ZIP `spec/content-v50-freedom/demon_king_v50/`의 README_FIRST, docs/CODEX_PROMPT를 읽고 실제 코드와 비교했다. 실행 manifest는 5.0.0이다. ChatGPT 원문47사건·106선택·106결과·32엔딩을 바이트 동일하게 설치했다. 조건·효과·확률·이동 엔진은 재개발하지 않았다.
- 구 공개44/119/20과 보류 v4.8 72/195/20은 체크포인트 `c7768ff2847ce21c4651339a87c2c7b7de1314e7`, `public/stories/demon-king-v48-archive/`, 기존 `backups/before-v4.8/`에 보존했다. 전체 복구 ZIP은 `C:\Users\jilzu\OneDrive\Codex\make_game_test\demon-king-backup-before-v50.zip`이다. 직전 공개 게임 커밋은 dee69111b564c1c08320832f85b9771e40274a06이다.
- 본문 배치·초상화·읽기/페이지·글자 크기/밝기·설정·재선택은 유지했다. 타이틀의 판 정보는 v5.0/실제47·32로 표시한다. 기존 승인된 트리의 수집 청록·현재 금·목표 파랑 CSS와 제스처 처리는 그대로 사용한다. 음향/AI 이미지 생성 추가0.
- v5 저장 키 `existence-sim:v1:run:demon-king:v5`, 도감 키 `existence-sim:v1:meta:demon-king:v5`, 분기 보관 키 `existence-sim:v1:tree-history:demon-king:v5`를 분리했다. 구 슬롯은 v5 전환 전용 `existence-sim:v1:backup:before-v5:demon-king:compact`에 백업하며 기존 업데이트 백업도 덮어쓰지 않는다. 구 슬롯을 지우거나 새 판으로 변환하지 않는다. 설정에서 이전 회차 JSON을 내보낼 수 있다. 구 세이브를 새 판에 가져오면 버전 안내와 함께 거부하고 현재/이전 원문을 유지한다.
- 브라우저별 실제 사용자 저장은 원래 브라우저의 로컬 저장소에 남는다. 검사에서는 구 회차/도감/분기 원문을 둔 상태로 새 게임·새 회차·백업·가져오기·재선택을 실행해 값 불변을 확인한다.

## 전체 그래프·독립 경로

실제 JSON 모든 목적지에서 47사건 노드+106선택/결과 노드+32엔딩+시작점=186노드, 213연결을 생성한다. 1부모를 강제하지 않고 다중 부모를 그대로 보존한다. 대표32경로 외 선택도 모두 존재한다. 다른 루트 사이 연결은 없으며, 4개 관문→8개 청년/중년/후반 경로와 각4엔딩을 확인한다. 모드 전환은 추가하지 않았다. 미발견 제목/결말/그림은 잠금, 힌트 경로는 명시적 옵트인이다. 실제 원장 없는 사건은 재선택할 수 없다.

| 방향 | 독립 루트 | 해당 사건 | 실제 도달 결말 |
| --- | --- | --- | --- |
| 도주 | exile | route_exile_opening, route_exile_middle_a, route_exile_middle_b, route_exile_final_a, route_exile_final_b | end_exile_map, end_exile_treaty, end_exile_class, end_exile_diaspora |
| 도주 | resistance | route_resistance_opening, route_resistance_middle_a, route_resistance_middle_b, route_resistance_final_a, route_resistance_final_b | end_resistance_march, end_resistance_network, end_resistance_confess, end_resistance_debate |
| 법 | evidence | route_evidence_opening, route_evidence_middle_a, route_evidence_middle_b, route_evidence_final_a, route_evidence_final_b | end_evidence_injunction, end_evidence_archive, end_evidence_witness, end_evidence_memory |
| 법 | collective | route_collective_opening, route_collective_middle_a, route_collective_middle_b, route_collective_final_a, route_collective_final_b | end_collective_fund, end_collective_individual, end_collective_repeal, end_collective_imperfect |
| 돈 | business | route_business_opening, route_business_middle_a, route_business_middle_b, route_business_final_a, route_business_final_b | end_business_safety, end_business_standard, end_business_theatre, end_business_license |
| 돈 | power | route_power_opening, route_power_middle_a, route_power_middle_b, route_power_final_a, route_power_final_b | end_power_truth, end_power_inquiry, end_power_democracy, end_power_small |
| 미나 | rescue | route_rescue_opening, route_rescue_middle_a, route_rescue_middle_b, route_rescue_final_a, route_rescue_final_b | end_rescue_patients, end_rescue_accord, end_rescue_graduation, end_rescue_speech |
| 미나 | letters | route_letters_opening, route_letters_middle_a, route_letters_middle_b, route_letters_final_a, route_letters_final_b | end_letters_together, end_letters_partners, end_letters_unsent, end_letters_thanks |

검증 예시는 [actual-ending-paths.json](actual-ending-paths.json), 전체 엔진 결과는 [engine-verification.json](engine-verification.json)에 보존한다. 조건을 무시해 이동하거나 엔딩 상태를 주입하지 않는다. 32개 예시의 매 단계 저장 재현과 실제 선택 원장/나이/종료를 비교한다. 별도로 엔진이 864종단 경로를 모두 실행해106개 선택/결과와47사건을 전수 방문했다. 조건부 연대기40문장·결말 회상43문장도 각 조건을 만족한 실제 경로에서 도달한다. 미래 선택/다른 루트의 회상을 생성하지 않는다.

## 기존 이미지 검수·연결

새 AI 그림 생성은0개다. 승인 기준 출생 그림, 기존 public 자산, 기존 generated_images의 최근20개 원본을 시각 비교했다. 7개 WebP를 설치했지만 실제 연결은6개/445,982바이트다. 동봉 청년 재판 그림1개는60세 사건과 맞지 않아 미연결로 보존했다. 기존PNG3개는 자르거나 합치지 않고 전체 비율로 WebP 인코딩했다. 7파일 총507,216바이트이며 모두120,000바이트 미만이다.

| 파일 | 바이트 | 적용 |
| --- | ---: | --- |
| assets/illustrations/event_cg_v50/birth_registry_reused.webp | 84,720 | birth |
| assets/illustrations/event_cg_v50/hero_exam_reused.webp | 93,950 | exam |
| assets/illustrations/event_cg_v50/mina_royal_hall_reused.webp | 73,794 | gate_mina |
| assets/illustrations/event_cg_v50/public_trial_reused.webp | 61,234 | 미연결: 60세에 청년 외형 |
| assets/illustrations/event_cg_v50/evidence_court_reused.webp | 51,508 | route_evidence_final_a |
| assets/illustrations/event_cg_v50/rescue_offer_reused.webp | 74,360 | route_rescue_final_a |
| assets/illustrations/event_cg_v50/letters_reflection_reused.webp | 67,650 | route_letters_final_a |

[illustration-audit.json](illustration-audit.json)은 파일별 원본·해시·검수 이유를 담는다. [illustration-queue.json](illustration-queue.json)에 개별 제작 프롬프트44개를 원문 보존했다. **신규 제작44개는 전부 미제작**이다. 그중 구호 최종a·편지 최종a의2개 장면은 검수된 기존 그림으로 표시하고, 추가 제작 대기는42개(사건10+엔딩32)다. 엔딩 전용 그림32개는 모두 없다. 새 도감과 결말 연출은 이전20개 SVG/WebP를 잘못 대신 연결하지 않고 텍스트로 표시하며, 도감 상세에 제작 대기를 안내한다.

구12세 나무칼 그림은 눈색/행동이 새 원고와 맞지 않아 사용하지 않는다. 미나는 긴 은빛 머리·푸른 눈이며 다른 인물과 합성하지 않았다. 출생 장면은 부모·아기·서기관이다. 나이가 안 맞는 재판 후보는 노년 증언 장면으로 대체했다. 원본보다 확대하지 않고 비율을 유지한다. 모바일 검사는 브라우저 세로 뷰포트 검사이며 실제 휴대기기 검사는 별도다.

## 코드·검사 범위

- `public/stories/demon-king-compact/`: 원문 manifest·5챕터·인물·엔딩, 결말 본문에서 분리한 표시용 ending_cinematics.
- `src/content/compact-contract.ts`, `validate.ts`, `ending-gallery.ts`, `freedom-memory.ts`, `route-years.ts`: v5 분류·구 어댑터 제외·실제32도감·조건부 과거.
- `src/persistence/{compatibility,migrate,reselect,tree-history}.ts`, `src/app/main.ts`: 슬롯/백업/구판 보존·32개 도감·실제 회차 상세.
- `src/ui/{compact-ending,ending-gallery,ending-tree,illustrations}.ts`, generated JSON2개: 새 결말/회상·제작 대기·전체DAG·검수CG 연결. 기존 카메라·색 CSS 변경 없음.
- `scripts/verify-freedom.ts`, 트리 생성/검증: 원문 바이트·전수 실제 선택·32경로·저장·연대기/회상 검증.
- 이전 UI 기대값은 `tests/archive-v48/`에 원본 보존했다. 이전 단위 검사는 동결 구판 데이터/트리로 계속 실행하고, 원작 UI 검사도 유지한다. 새 판에 구20엔딩 수를 강제하지 않는다.
- `tests/story/freedom.test.ts`, `tests/e2e/freedom-compact.spec.ts`, `tree-compact.spec.ts`: 새32개 실제 UI 플레이/중간저장/주마등/마지막카드 해금/상세/잠금·이미지·설정·백업·분기 색·재선택·제스처·검색·접기.

## 검증 중 발견·수정

1. 테스트에서 엔진을 직접 ESM으로 불러오자 기존 AJV 하위 경로 해석이 달라 수집이 중단됐다. 런타임 코어를 바꾸지 않고 기존 프로젝트의 tsx 픽스처 방식을 사용했다. 실제 UI 플레이에는 상태를 주입하지 않는다.
2. 재선택 UI 검사에서 존재하지 않는 exam_petition을 기대해 실패했다. 실제 JSON ID exam_object로 수정했다. 게임 엔진 오류가 아니며 데이터/원고는 변경하지 않았다.
3. 기존 테스트를 동결 경로로 옮길 때 줄바꿈 차이가 불필요한 diff를 만들었다. 저장소의 원래 줄바꿈을 유지해 내용 변경만 남겼다. 정리 도중 개발 서버의 자동 새로고침으로 재선택 검사가 끊겨 전체 검사를 중단했으며, 코드 동결 후 재검사한다.
4. 구판의 이전 import 백업이 이미 있으면 v5 전환 시점과 다를 수 있음을 확인했다. 기존 백업은 보존하고 v5 전환 전용 키에 구판 회차/도감 원문을 백업해 내보내도록 수정했다. 이미 오래된 백업이 존재하는 PC/모바일 사례도 통과했다.

## 최종 검사·배포

진행 중: 로컬 npm run check, PC/모바일 및 공개 배포 검증 결과를 갱신한다.
