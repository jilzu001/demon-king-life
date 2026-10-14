# Phase 1 콘텐츠 계약 안내

현재 적용 작품은 콘텐츠 v1.1입니다. 챕터/조건/효과의 아래 계약은 유지하고, 표시용 추가 데이터는 별도 `presentation.json`과 `presentation.schema.json`을 사용합니다. 작품의 법적 판결/혼인 표현은 `legal-events-v11.ts`/`policies.ts`의 명시된 이벤트와 `married_erisia`로 연결합니다. 기존 예제의 혼인/이혼 보호 규칙도 유지합니다. 현재 정사는 `CONTENT_CANON.md`, 적용/호환성 안내는 `docs/CONTENT_V11_IMPORT.md`를 우선 확인하세요.

원문 계약은 `spec/DEVELOPMENT_SPEC.md`, 공식 설정은 `CANON.md`입니다. 첨부 예제는 테스트 콘텐츠이며 정식 전체 작품과 혼합하지 않습니다.

1. JSON은 UTF-8 표준 문법으로 작성합니다. 중복 키·주석·후행 쉼표·임의 실행 코드는 거부합니다.
2. ID를 변경하거나 재사용하지 마세요. 장면·인물·엔딩 ID는 스토리 전체에서, 선택 ID는 장면에서, 결과 ID는 선택에서 유일해야 합니다.
3. 조건은 `eq/neq/gt/gte/lt/lte/contains`와 `all/any/not`만 허용됩니다. 모든 선택에 현재 상태에서 성립할 결과가 필요합니다. 실패 경로를 작성하세요.
4. 효과는 `set/add/addToSet/removeFromSet`만 허용됩니다. 배열 전체 교체와 전과 삭제는 v1 계약의 원시값 효과로 표현하지 않습니다. 금화·물품·능력치는 음수가 될 수 없으며 신뢰·호감은 정수 -100~100입니다.
5. 인물은 `characters.json` 및 초기 `npcs`에 등록합니다. v1 아이템 카탈로그는 `initialState.inventory`의 키로 지정합니다. 소지하지 않은 등록 아이템은 값 0을 사용하세요. 미등록 경로는 에러입니다.
6. 그래프는 DAG이며 시간 역행과 장면 재진입은 금지됩니다. 장면 진입 효과는 렌더링과 별개로 한 번만 적용됩니다.
7. `chronicle.presence`는 현장 등장, `reference`는 언급, `flashback`은 회상입니다. 사망자의 현장 등장은 거부하며 조건부 항목은 `when` 충족 시만 표시·검사합니다.
8. 법적 판결은 별도 작가 검수 이벤트로 `src/content/policies.ts`에 등록해야 합니다. 고발이나 분위기만으로 전과가 생겨서는 안 됩니다. 새 법적 이벤트에는 근거와 회귀 테스트가 필요합니다.
9. 혼인/이혼 확장 시 최소 보호 검사는 `marriage_registered`, `marriage_consent_player`, `marriage_consent_<npcId>`, `divorce_finalized_<npcId>`입니다. 이는 Phase 1의 검사 규칙이며 예제의 정사를 추가한 것이 아닙니다. 신청·높은 호감만으로 확정하지 마세요.
10. 엔딩은 실제 원장과 조건부 회고만 사용합니다. 사망은 `player.alive=false` 효과를 작성해야 하며 엔딩 후 전이를 허용하지 않습니다.

수정 후 `npm run validate:content`, `npm run simulate:all`, `npm test`를 실행합니다. 전수 탐색 상한을 초과하면 검증 미완료이며 공개 배포 조건을 만족하지 않습니다. 자동 검사가 통과해도 본문의 인과·동기·법률은 작가 검수가 필요합니다.
