# v3.6 → v3.6.1 → v3.7 적용·검수

기준일 2026-10-15. v3.7 적용 지시를 먼저 읽고 세 ZIP을 각각 spec 폴더에 원본 보관했다. 아래 로컬·공개 검증과 기존 주소의 배포 확인을 완료했다.

## 순차 적용과 보호

- v3.6: `2d0d037`. 신규 자산/메인 본문 표시/자연 크기 상한 및65개 준비본 문안 병합. 결과 문단18개의 문자열 불일치는 작가 제공 문단으로 동기화했다. 조건/effects/선택 ID는 변경하지 않았다. [이전 단계](V3_6_APPLY.md).
- v3.6.1: `19bddb4`. 공개 판의 구 선택 attack/refuse/invoice를 모두 유지하고 **confess: 미나에게 사랑한다고 고백한다.**를 네 번째로 추가했다. 동봉 confession/confession_afterm/confession_chaos와 ending_love_scandal을 그대로 재사용했다. 로맨스 성공을 만들지 않았다.
- v3.7: 미나의 붉은 머리 실사 초상화와 은회색 머리 웹툰 기본 초상화가 불일치했다. 실제 대조한 기준 이미지를 상단·본문·미나가 등장한 실제 기억에서 재사용한다. 미확정 CG/표정/연령 변형은 공개 연결을 보류했다. 기존 이미지 파일은 삭제/덮어쓰기하지 않았다.
- 실행 버전은 기존 선택을 보존한 `2.3.0-compact`, **16사건/36선택/8엔딩**이다. 동봉2.7 코어로 통째 교체하지 않았다. 초기 상태/캐릭터, 구13사건의 본문/28선택/7엔딩·연출은 보존했다. 보관 원작98사건/340선택/34엔딩과 구 저장 슬롯은 별도 보호한다.

## 이미지 전수 검수

[파일별 CSV](V3_7_VISUAL_AUDIT.csv), [크기·해시·근거 포함 JSON](V3_7_VISUAL_AUDIT.json): **177개 = 기존 공개167개 + 신규 회상10개**. 동일 ZIP 중복 파일은 재집계하지 않았다. **PASS21 / FAIL49 / UNKNOWN107**. 파일명만으로 동일 인물이라고 승인하지 않았다. 비교 근거는 [검수 시트/화면](v37-review/).

| 대상 | 검수·조치 |
| --- | --- |
| 미나 기본 `characters/mina.webp` | 은회색 머리·옆 땋은 머리·청회색 눈·검정/은색 갑옷. 같은 파일로 상단·본문·회상 통일 |
| 기존 미나24개 | 붉은 짧은 머리/실사 얼굴: FAIL. 공개 연결 중단; 파일과 보관 원작은 유지 |
| 주인공 기본/기존24개 | 검은 뾰족머리 웹툰 기준으로 통일. 갈색 계열 실사 세트는 FAIL·공개 사용 중단 |
| 에리시아/국왕 기존48개 | 옷/얼굴/수염의 나이별 동일성 승인 근거 부족: UNKNOWN. 기준 초상화만 사용 |
| 감사관24개/레온 | 감사관의 확정 기준 이미지와 레온 초상화 없음. 다른 인물을 재명명하지 않고 오른쪽은 배경 |
| 나무칼 CG | 눈색·헤어/얼굴 불일치 FAIL. child의 정확한12세 나무칼 문단은 기준 미나 초상화로 대체. 어린이 행동 CG로 승인한 것이 아님 |
| 로맨스/은퇴/왕실 재판/석양 등8개 CG | 인물/연령/현재 선택 결과 대응 UNKNOWN. 기존 peace/throne 그림은 각각 기본 주인공/국왕으로 대체; 나머지 보류 |
| 회상10개 | 그림 속 인물·나이·사건/결과 대응 UNKNOWN. spec에 보관하고 공개 연결하지 않음. 실제 기억 텍스트·얼굴 없는 기호/기준 미나로 주마등 유지 |
| 공용 표정10개/미대응 인물7개 | 정체성/공개 판 actor 대응 UNKNOWN. NPC 대용 금지 |
| 배경8개/UI기호8개/기존 배경1개 | PASS. 관련 배경만 표시하고 미사용 기호는 연결하지 않음 |

초상화는 **인물을 식별하는 기본 이미지**다. 12세·중년·노년·감정별 장면 그림이 승인됐다는 뜻이 아니다. 플레이 나이와 NPC 생존/상태는 원장 그대로 유지한다. 새 나이 설정을 만들지 않았다. 결말에 미나가 묘사된다고 확정할 근거가 없으므로 미나 로맨스/은퇴 CG를 넣지 않았다.

## NPC와 화면

- 실제 본문의 명시 대사를 수동 대조한 `compact-speakers.json`으로 연결한다. 정확한 문단 문자열이 바뀌면 자동 추정하지 않고 배경으로 폴백한다.
- 미나→내레이션→에리시아 전환, 감사관/시험관/주인공 대사 및 미등록 인물에서는 이전 초상화를 남기지 않는다. 사망 인물/이미지 오류도 배경으로 폴백한다.
- 스크롤 모드는 마지막 공개 문단, 페이지 모드는 현재 페이지의 마지막 가시 문단을 기준으로 한다. 한 페이지에 여러 화자가 함께 있으면 최근 대사/내레이션을 표시한다. 사건 전체의 기본 NPC를 강제로 두지 않는다.
- 읽기 속도/클릭 한 문단/스킵/선택 후 서술/선택 팝업/페이지 즉시 표시는 유지한다. 대사 카드를 중복 생성하지 않는다.
- 본문/회상/결말은 원본 크기 이하·비율 유지·contain, 사건당 최대1장. 타이틀 배경도 원본1280×853 상한. PC와 모바일 세로만 검사한다.

## 저장과 분기

구2.2 저장은 **구13사건 계약으로** 먼저 전체 원장·상태·seed 재현을 검증하고, 버전만2.3으로 변경해 신 계약으로 다시 검증한다. 구 버전으로 위장한 고백 원장/변조 상태는 거부한다. 새 회차를 강제하지 않는다. 원문은 `existence-sim:v1:backup:before-v3.7:demon-king:compact`에 한 번 보관한다. 구 재선택 백업도 같은 검증을 거쳐 복원한다. 도감/선택 ID/RNG/기존 엔딩과 저장 스키마를 변경하지 않는다.

새 사랑 소동 결말의 연출만 작가의 기존 결말 문장을 두 부분으로 나눴다. 원문의 사건 나이20세와 결말 본문22세가 불일치하지만 나이 effects를 임의 생성하지 않았다. 작가의 후속 정정이 필요하다.

## 검증

- 기존147종단 경로의 모든 중간 저장,100개 seed, 변조 거부/백업·복원, 구 선택/효과 보호 단위 검사 통과.
- 현재16사건/8엔딩 **319종단 경로** 통과. 보관 원작34엔딩도 전수 도달 검사 통과.
- PC/모바일 선택2·3·4·5개 전부 표시·각각 클릭·마지막 항목 접근, 정확한 고백 문구/후속 사건, NPC 등장/퇴장/미나→에리시아, 페이지별 내레이션 검사 통과.5개는 검수용 데이터이며 공개 스토리에 추가하지 않았다.
- `npm run check` 종료코드0: 단위120개+브라우저108개=**228개**, 타입/스키마/원작34엔딩·현재319경로/프로덕션 빌드 통과. [전체 로그](v37-check.log).
- `verify-illustrations-ui.ts` 실제 빌드 PC1280×900·세로320×568/360×800/390×844/430×932, 스크롤/페이지, 글자150%, 브라우저 확대100%, DPR1/2 **각120개·총240조합 통과**. 원본 크기·비율/그림 전체 노출/페이지별 모든 글자 좌표/선택 팝업/문서 넘침/저장 원장 불변 확인. [DPR1](v37-ui-dpr1.log), [DPR2](v37-ui-dpr2.log).
- `verify-v37-public.mjs` 로컬 빌드175개 파일 HTTP200/원본 바이트 일치: 이미지167개+스토리5개+정책3개. Windows PowerShell5.1 `Start-Game.ps1 -NoBrowser` 종료코드0.
- v3.6.1→v3.7 공통102파일의 바이트가 동일하다. v3.7은 검수 지침/인벤토리/정체성 규칙 추가이며 기존 얼굴을 새로 그린 패키지가 아님을 확인했다.
- 미나 비교: [PC 대사/상단](v37-review/exam-speaker-PC.png), [모바일 대사/상단](v37-review/exam-speaker-모바일-320.png), [PC 회상](v37-review/memory-mina-PC.png), [모바일 회상](v37-review/memory-mina-모바일-320.png), [모바일150%·DPR2 본문](v37-review/page-child-320-dpr2.png). 미나가 확정되지 않은 결말에 미나 그림을 넣지 않음: [모바일 석양 결말](v37-review/ending_peace-모바일-320.png), [모바일 왕실 결말](v37-review/ending_throne-모바일-320.png).

실패 접근: Playwright 프로세스에 엔진 로더를 직접 import하자 Node ESM의 Ajv 확장자 해석에서 수집이 실패했다. 런타임을 바꾸지 않고 기존 tsx로 실제 저장 픽스처를 생성해 해결했다. Vite의 public JSON import 경고는 동일 바이트의 spec manifest import로 수정했다.

재개 시 로컬4175 서버가 꺼져 있어 첫 DPR 검수가 연결 거부로 종료됐다. 포트/기존 실행기를 확인하고 `Start-Game.ps1 -NoBrowser`로 시작한 후 HTTP 검증과 두 DPR 검수를 순서대로 재실행해 모두 통과했다. PowerShell의 rg 파일 와일드카드 인수는 잘못된 경로로 처리돼 디렉터리+`--glob` 방식으로 전환했다.

## 새 일러스트/추가 작업

1. 같은 미나의 **12세 나무칼·20세 시험·중년·노년** 및 감정별 초상화: 머리/눈/얼굴 기준을 유지하고 연령별 의상 승인이 필요하다.
2. 미나의 고백 반응/은퇴·왕실 재판·석양: 실제 분기 결과와 등장 인물/나이로 다시 제작해야 한다. 고백은 승낙 확정이 아니다.
3. 주인공/에리시아/국왕의 연령 변형, 감사관/레온의 공식 기준 초상화가 필요하다.
4. 회상10개는 실제 사건 ID·선택 결과·등장 인물·나이를 먼저 확정한 후 재제작/승인해야 한다.
5. **65개 확장 사건은 문안 준비본으로 보관 중이며 실행 연결/회차 해금은 아직 미적용**이다. ZIP의 ‘기존65개 실행’ 전제와 실제 공개13사건이 달라 임의로 다른 엔진/세이브로 교체하지 않았다. 본 작업의16개 검사 성공을65개 검증으로 표시하지 않는다.

실제 휴대기기/Safari/Firefox 검수는 미실행이며 브라우저의 PC/모바일 세로 검수와 구분한다.

## 수정 파일

원래 공개 소스c6d8c03 대비 전체 경로는 [수정 파일 목록](V3_7_CHANGED_FILES.txt)에 기록했다. 아래는 기능별 주요 파일이다.

- 데이터: `content/events_v2_9.json`, `public/stories/demon-king-compact/{story,endings,ending_cinematics}.json`, `chapters/01_complete.json`, `public/assets/` manifest/정책/나무칼 원본 보관.
- 실행: `src/app/main.ts`, `src/content/compact-contract.ts`, `src/persistence/{compact-compatible,compatibility,reselect}.ts`, `src/ui/{visual-identity,illustrations,compact-ending,pages}.ts`, `compact-speakers.json`, `src/styles/main.css`, `Start-Game.ps1`.
- 검증: `scripts/validate-compact.ts`, `verify-illustrations-ui.ts`, `verify-pages-ui.ts`, `verify-v37-public.mjs`, `verify-confession-ui.ts`, `v37-ui-fixtures.ts`, 세 적용/보고 Python 스크립트, `tests/story/{compact,compact-upgrade,illustrations,visual-identity,content-v36}.test.ts`, `tests/e2e/compact.spec.ts`.
- 기록/근거: 세 ZIP의 spec 원본 폴더, 이 보고서/CSV/JSON/스크린샷, `AGENTS.md`, `DEV_PROGRESS.md`, `WRITING_PROGRESS.md`, `CHANGELOG.md`, `HANDOFF.md`. 기록 초기화는27b5a81에서 확보했다.

## 공개 배포 확인 — 완료

- [플레이](https://jilzu001.github.io/demon-king-life/), 게임 소스 **c6bbd96935b60d75c67df0f7be19a2a9c8749bd6**, [Actions38648070275](https://github.com/jilzu001/demon-king-life/actions/runs/38648070275) build/deploy 모두 success. Ubuntu/Chromium에서도 동일 소스의 `npm run check` 단계가 통과했다.
- 공개175개 파일(이미지167+스토리5+정책3) HTTP200/원본 바이트 일치.
- 실제 공개 링크에서도 PC/모바일 세로4크기·150% 글자·두 읽기 방식·DPR1/2 **총240조합 종료코드0**. [공개DPR1](v37-public-dpr1.log), [공개DPR2](v37-public-dpr2.log).
- 실제 빈 회차에서 출생→12세→20세 시험을 플레이해 네 선택/고백 원문·클릭·후속 대사·원장·같은 미나 초상화까지 PC/모바일2경로 종료코드0. [실제 플레이 로그](v37-public-confession.log), [모바일 네 번째 선택](v37-review/public-confession-choice-mobile.png), [모바일 후속 화자](v37-review/public-confession-speaker-mobile.png), [PC 선택](v37-review/public-confession-choice-PC.png).
- 마지막 기록/검증 스크립트 커밋은 게임 소스를 변경하지 않는다. 실제 휴대기기/Safari/Firefox·65개 확장 실행과 새 나이별 CG는 위 미완료 항목 그대로다.
