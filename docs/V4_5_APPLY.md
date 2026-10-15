# v4.5 안전 병합·스토리·일러스트 검증

기준일2026-10-15. 기준 저장소7002519(게임 배포1469825), 입력 `spec/content-v4.5-story-art/`176파일. README_V4_5.md/CODEX_APPLY_V4_5_STORY_ART.md/연간 마이그레이션을 먼저 읽었다. 기존 데이터는 `backups/before-v4.5/`에 보존했다. 확장4사건의 실제 연결은 사용자에게 범위를 설명한 뒤 명시 승인받았다. 메인/설정/하단 버튼의 구성은 유지한다.

## 적용 내역

- 코어 본문 child/petition/invoice/office4개와 child 요약1개, invoice/bring_mina·exam/confess·confession/confess_sincere·settlement/reject_money의 결과문4개만 갱신했다. 기존103선택의 ID/조건/확률/효과/목적지는 유지했다. ZIP의 attack_mina/stand_ground/absurd_invoice 이름을 현재 attack/refuse/invoice로 덮어쓰지 않았다.
- 확장 birth_tax/mina_bridge/orphan_registry/old_mina의 본문4개·결과12개를 준비본에 병합했다. 구 result와 새 resultNarrative/resultParagraphs가 서로 달라, 새 집필 결과를 세 필드에 일치시켰다. 원본 ZIP은 그대로다. birth_tax는 준비본/실행본 모두6세다.
- 승인받은4사건만 기존 사건에 선택적 진입을 덧붙여 실제 연결했다. 전체44사건/119선택/20엔딩이다. 기존103선택을 선택하면 원래 경로로 진행한다. 별도65사건 전체 엔진을 새로 이식하지 않았다.

| 새 사건 | 실제 진입 | 나이 | 결과 선택 | 이후 사건 |
| --- | --- | --- | --- | --- |
| birth_tax | birth → explore_route_v45_birth_tax | 6 | birth_tax_1/2/3 | child12세 |
| mina_bridge | princess → explore_route_v45_mina_bridge | 35 | mina_bridge_1/2/3 | audit41세 |
| orphan_registry | settlement → explore_route_v45_orphan_registry | 50 | orphan_registry_1/2/3 | quiet65세 |
| old_mina | hearing → explore_route_v45_old_mina | 57 | old_mina_1/2/3 | final_trial60세 |

- 연간325개 중10개 나이×5후보=50문장을 갱신했다. 실제 도달한 두 사건 사이를 한 해씩 읽으며, 큰 사건이 있는 해에는 연간 줄을 추가하지 않는다. 기존 자동/클릭/스킵/페이지 기능을 사용하고 연간 선택/효과는 만들지 않는다. 읽는 나이와 최근 한 줄만 화면에서 진행하며, 코어 사건의 판정/저장 원장을 다시 쓰지 않는다. 선택 직후에는 해당 선택 나이를 유지한 뒤 다음 해 기록으로 이어진다.
- 같은 나이의5후보는 별도 표시 원장 `demon-king:annual-variants:v4.5`에서5회차 중복 없이 순환하고 회차별 ID를 고정한다. 게임 RNG/세이브/도감과 분리한다. 표시 저장소가 없거나 손상/차단되면 원문을 덮어쓰지 않고 seed 기반 고정 표시로 내려간다.
- v4.1의 강제 선택154개와 콜백은 불러오지 않는다. 알려진 잔여 플래그154종은 원문 그대로 읽되 저장 재현 비교에서만 제외한다. 다른 플래그/상태/금화/엔딩 변조는 계속 거절한다. 삭제된 구 선택 원장을 현재 선택으로 추측 변환하지 않는다.
- 회상 문장12개는 실제 해당 노드 방문, 현재 보유 플래그, 그 플래그를 실제 과거 선택 결과로 얻은 원장을 함께 확인한다. 배열 순서대로 사건당 최대1문장만 본문 뒤에 표시한다. 잔여 연간 플래그나 미래 방문만으로 회상하지 않는다.
- ending_mina_wedding/ending_retirement_47/ending_mother_petition의 전체 결말을 갱신했다. 기존20개 도감 목록/상세/설명/그림/획득 잠금과4단계 연출은 재사용한다. 공식 ending_art_manifest_v4_4.json과 기존 엔딩 이미지19파일은 변경하지 않았다.

## 이미지 연결

새 CG3개는 **121,090바이트(약118KiB)**. 원본 WebP를 그대로 복사하고 실제 디코딩·가로세로를 확인했다. [파일별 크기·SHA256](v4.5/new-art-files.json), [인물/CG 대조 이미지](v4.5/source-contact-sheet.jpg).

| CG | 원본 크기/용량 | 적용 조건 | 검수 |
| --- | --- | --- | --- |
| cg_birth_registry.webp | 700×525 / 44,978B | 실제 birth/0세 | 주인공은 신생아, 갈색 머리 부모는 별개 성인 |
| cg_mina_royal_hall.webp | 700×525 / 39,450B | invoice/21세/bring_mina/out_bring_mina/실제 mina_witness·생존·관계 확인 | 은발·푸른 눈 미나/검은 머리 주인공; accept_invite에서는 표시하지 않음 |
| cg_public_hearing.webp | 700×930 / 36,662B | hearing/47세·실제 public_audit 선택 확인 | 주인공/재판장; 원본 말풍선을 제외한 세로 CG |

- 새 그림은 기존 본문/결과의 관련 문단과 함께 표시하며 원본 비율·크기 상한을 지킨다. 실패하면 그림 프레임만 제거하고 텍스트/선택/저장을 유지한다. 연간 줄에 그림을 강제로 붙이지 않는다.
- 미나의 기존 검증 초상화도 은발이다. 레온/붉은 머리 대체 이미지를 새로 연결하지 않았다. 바뀐 본문의 실제 미나 대사만 화자 자료를 갱신하고 이름을 모르는 서기관/부모를 미나로 추정하지 않았다.
- 주마등은 실제 원장의4~8개 사건/선택만 사용한다. 조건이 맞는 CG → 해당 방문 사건 그림 순으로 선택하며 같은 그림은 한 번만 쓴다. 적합한 그림이 없으면 글만 표시한다. SVG 생성 함수와 벡터 대체 호출은 제거했다.

## 수정 파일

- 데이터: `public/stories/demon-king-compact/chapters/01_complete.json`, 새 `03_v45_expansion.json`, story.json/endings.json, `content/events_v2_9.json`.
- 표시 계약: `src/content/route-years.ts`, 새 annual-variants.ts, ending-gallery.ts의 새 원고 참조; `schemas/scene-art.schema.json`, schema.ts.
- 화면: `src/ui/illustrations.ts`, compact-ending.ts, compact-speakers.json, `src/app/main.ts`. 도감 렌더러/styles/엔딩 공식 매핑은 그대로다.
- 호환성: `src/persistence/migrate.ts`의 알려진 연간 잔여 플래그 처리만 추가. 엔진 전이/효과/조건 판정·save/meta 스키마·슬롯은 변경하지 않았다.
- 에셋: 기존 assets.json에 새3개만 추가하고 scene_art_manifest_v4_5.json/원본 CG3개 복사.
- 검증: story-art-v45.test.ts, v45-compact.spec.ts, verify-scene-art-v45.mjs와 변경된 문안/이미지에 맞는 기존 검사 기대값. 과거 v3.6/구판 문안 검사는 당시 백업으로 보존하고, 현재103선택 보호는 별도 엄격 비교한다.

## 검증 기록

- 구조/타입 검사 통과. 전수 분기44사건/119선택/20엔딩/**91,664종단 경로**, 경고0. [분기 로그](v4.5/simulation.log).
- 단위257개/15파일 통과. 기존103선택 계약·허용 문안 변경·원고4개·연간50개·잔여 플래그/변조 차단·5회차 순환·CG 조건 검사 포함. [단위 로그](v4.5/unit.log).
- PC/모바일의 확장4사건×3선택/저장/후속 진입, 자동/클릭1년 진행, CG·회상·주마등34개 통과. [기능 로그](v4.5/v45-browser.log). 후속 전체 검사에서 최신 코드로 다시 확인한다.
- 기존 회귀의 기대값 중 v4.5가 바꾼4결과/출생CG/연간 기록 수를 갱신했다. 관련 PC9개 통과. [재검사](v4.5/changed-ui.log).
- `npm run check` 종료0: 단위257개+브라우저224개=**481개**, 타입/원작·현재 콘텐츠/전수 분기/최종 빌드 통과. 새12개 포함20개 엔딩을 새 게임부터 PC·모바일 각각 실제 선택으로 도달하고 저장 복원·주마등·해금·도감 상세·동일 이미지까지 확인했다. [전체 로그](v4.5/check.log), [20개 선택 경로/결말/그림](v4.5/actual-ending-paths.json).
- 실제 하위 경로 빌드에서 PC1280 및 모바일320/360/390/430, 스크롤/페이지·150% 글자·12장면의**120조합** 통과. 자동 스크롤/페이지 글자 누락·선택 팝업·그림 비율·저장 불변을 확인했다. [레이아웃 로그](v4.5/layout.log).
- 새3개 CG와 기존19개 엔딩 WebP/20매핑, 기존175파일은 로컬 빌드에서 HTTP200/원본 바이트 동일. 다른 출처 HTTP iframe도 PC·모바일 WebP 경로/비율 통과. [CG](v4.5/scene-art-local.json), [엔딩](v4.5/ending-art-local.json), [기존 파일](v4.5/protected-files-local.log), [임베드](v4.5/embed-local.log).
- 엔진·저장/메타 스키마·도감 렌더러·검증 초상화 매핑·공식 엔딩 매핑 등23개 보호 파일의 Git blob이 기준과 동일하다. [대조 기록](v4.5/protected-contract-files.json). 과거 v4.4의440개 성공을 이번 검사로 사용하지 않는다.

## 초기 검수 오류와 처리

- 새 확장 테스트의 제목 선택자가 사건 제목과 선택 팝업 제목2개를 잡았다. #scene-title로 한정해34개 통과했다. 게임 제목/선택을 지우지 않았다. [초기 로그](v4.5/initial-browser-selector.log).
- 이전 문안 보존 검사가 허용된 새 집필 문안과 충돌했고, 화자 자료의 문단 인덱스도 과거 원고 기준이었다. 역사적 검사는 백업으로 보존하고 현재 문안/화자는 새 원문과 직접 대조했다. [초기 단위](v4.5/initial-unit.log).
- 구판 UI 자료 생성기가4결과의 예전 텍스트를 반환하고, 그림 오류 검사는 폐지된 마을 그림을 차단하고 있었다. 실제 현재 결과문/출생CG로 수정했다. 전체 기록의3개 핵심 사건과18개 연간 줄도 구분해서 검증한다. [초기 PC 회귀](v4.5/initial-pc-regression.log).

## 최종 결과·미해결

- 로컬 전체481개/빌드 완료. 공개 배포·최종 공개 검증 진행 중. 로컬 미리보기4177은 새 작업본이며 공개판과 구분한다.
- 승인한4개 확장만 실제 연결했으며 준비본65개 전체를 활성화했다고 보고하지 않는다. 집중 집필은 old_mina의 새 근거1개만 추가해23/65·보완42(35.4%)다.
- 표시용 연간 원장은 브라우저별 저장이다. 게임 JSON 입출력에는 이 표시 원장을 추가하지 않아 기기 이동 시 연간 후보가 달라질 수 있으나 선택/결과/엔딩은 동일하다.
- 별도 티스토리 글 주소가 없어 실제 글의 CSP/sandbox는 미검증이다. 실제 휴대기기/Safari/Firefox 및 전용 엔딩 원화 보완도 별도 항목이다.
