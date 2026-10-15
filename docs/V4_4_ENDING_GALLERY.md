# v4.4 엔딩 도감·WebP 연결 검토 및 적용 기록

기준일 2026-10-15. 기준 코드9547ea5, 작업 브랜치 `feature/v4.4-ending-gallery`. 현재 공개 게임e5ec50d와 이 작업본을 구분한다. UI 변경안은 사용자에게 먼저 설명했고 **‘제안대로 UI 변경 승인’**을 받았다. 신규12개 실제 진입 연결은 추가 사건/선택을 수반하므로 별도로 범위를 확인 중이다.

## 조사 결과와 벡터가 나온 원인

- 기존 `src/app/main.ts`의 도감은 설정 하단에 발견 제목만 `ul/li`로 나열했다. 상세 화면/대표 그림/전체 결말 기능이 없었다.
- 기존 `src/ui/compact-ending.ts`의 마지막 phase3는 `compactArt(cinematic.illustration)`를 무조건 호출했다. `sunset`, `scroll` 같은 토큰을 SVG 도형으로 만드는 함수다. phase0에서는 `src/ui/illustrations.ts`의 별도 매핑이 평화→주인공/처형→왕 두 개만 처리했다. 이 두 경로가 v4.4 WebP 매핑을 사용하지 않아 마지막 카드가 계속 벡터로 나왔다.
- 영구 획득 기록은 `existence-sim:v1:meta:demon-king:compact`의 `discoveredEndings['demon-king']`이다. 마지막 phase3에서만 SaveStore.commit으로 추가하는 규칙을 유지했다. 나이/조건 충족이나 도감 열람으로 해금하지 않는다.
- 현재 런타임은16사건/43선택/8엔딩이다. 입력의20개 중 신규12개는 `integration-required`/`needs_codex_conditional_scheduler`로 표시된 사이드카 설계다. 원본 게임 엔진은 ZIP에 없다.20개 도감 등록/이미지 표시 검증과20개 실제 플레이 도달을 구분한다.
- 누적 ZIP은 기존16개 본문/선택 결과,8개 결말 본문·recap을 재집필했고 시험의 attack/refuse/invoice ID를 다른 ID로 바꿨다. 보호 요청에 따라 덮어쓰지 않았다. 실제 게임의 기존 제목/결말 본문을 도감에 사용한다.

## 적용한 파일과 동작

- `src/content/ending-gallery.ts`: 공식 `assets/ending_art_manifest_v4_4.json`을 유일한 엔딩 이미지 lookup으로 사용한다. 도감20개/이미지20개 ID·경로·텍스트를 검증하며, 기존 결말 본문은 현재 스토리를 우선한다.
- `schemas/ending-art.schema.json`, `schemas/ending-gallery.schema.json`, `src/content/schema.ts`: 경로·ID·20개 범위·WebP 전용/벡터 대체 금지 계약. 외부 URL/SVG/상위 경로/잘못된 ID는 거부한다.
- `src/ui/ending-gallery.ts`, `src/app/main.ts`, `src/styles/main.css`: 기존 설정 창의20개 목록→획득 항목 상세→닫기/ESC로 목록 복귀. 미획득 제목·그림·본문을 DOM에 넣지 않고 이미지를 요청하지 않는다. 닫은 뒤 선택했던 항목으로 초점이 돌아간다. 메인 화면/하단 버튼 배치는 유지한다.
- `src/ui/compact-ending.ts`, `src/ui/illustrations.ts`: phase0/phase3/도감 모두 같은 엔딩 ID로 같은 WebP를 쓴다. 기존 별도 두 엔딩 매핑을 제거했다. 방문 장면별 주마등 그림/SVG/실제 방문 기록 선택/타이밍은 유지한다. 최종 카드에서는 SVG를 만들지 않는다.
- `public/stories/demon-king-compact/ending_cinematics.json`: 기존8개 finalScene/reflection/replayRules를 유지하고 illustration 경로만 공식 WebP로 변경했다. 원문 JSON은 `backups/before-v4.4/`에 보존했다. 엔진/세이브 스키마/선택43개/8개 결말 본문은 변경하지 않았다.
- `public/assets/ending_art_manifest_v4_4.json`, `public/assets/illustrations/ending_v4_3/*.webp`: 공식 매핑과 신규12개만 복사. 기존7개 재사용 파일은 바이트가 같아 덮어쓰지 않았다. React 참고 코드는 이식하지 않고 기존 DOM/TypeScript 방식을 유지했다.
- 이미지 실패 시 텍스트를 표시한다. 원본 비율·width/height auto·contain·높이360px/너비640px 상한으로 원본보다 크게 표시하지 않는다. 타이틀/상단 초상화의 기존 cover 규칙은 변경하지 않는다.

## 이미지별 상태와 한계

[파일별 검수](v4.4/art-file-audit.json), [전체 검토 이미지](v4.4/art-contact-sheet.jpg).20개 엔딩 참조는 **WebP19개 파일**이다. ending_fire/ending_ledger가 같은 queens_letter.webp를 재사용한다. 중복을 제외한 합계382,312바이트(약373KiB), 모든 파일을 실제 디코딩했다. 기존 파일은 원본 바이트와 같고 신규12개도 원본을 그대로 사용했다.

- 기존8개는 전용 엔딩 원화가 아닌 기존 장면 재사용이다. 화재/장부는 인물 장면을 재사용하고, 연애 이미지에는 원본의 예시 배너가 포함되어 있어 전용 원화 보완이 필요하다. 자르거나 새 얼굴로 바꾸지 않았다.
- 신규12개는640×360 기준 초상화 회상 합성 시안이다. 고령 얼굴을 새로 생성하지 않았고 현재 나이의 전용 그림으로 간주하지 않는다. 화면에도 임시/회상 합성 또는 장면 재사용임을 표시한다. 정식 전용 원화20장을 완성했다고 보고하지 않는다.
- 현재 플레이 연결8개/추가12개 진입 준비 상태를 도감에 표시한다. 추가12개를 임의 해금하거나 테스트용 획득 배열/데모 버튼을 배포하지 않는다.

## 확인한 테스트

- 전체 `npm run check` 통과: 단위227개/13파일 + PC·모바일 브라우저150개 = **377개**. 타입·콘텐츠·현재5,328경로/8엔딩·보관 원작34엔딩·최종 빌드까지 종료 코드0이다. [전체 로그](v4.4/check.log).
- 기준9547ea5 대비 엔진·저장 처리·스토리31파일 바이트 동일, 연출 JSON은8개 illustration 필드만 변경됐다. [보호 파일 해시](v4.4/protected-files.json).
- 패키지 자체 `python -X utf8 spec/content-v4.4-ending-gallery/audit/validate_ending_gallery_v4_4.py` 통과. 이는 ZIP 내부20개 일치 검사이며 현재 게임20개 도달 검증이 아니다.
- 관련 단위8개 통과:20개 매핑/19개 원본 파일, 안전한 경로/배포 base, 현재 결말 보존, 영구 획득 기록 불변. [로그](v4.4/gallery-unit.log).
- PC1280×900/모바일320×800·글자150%의 도감/404 **4개 검사 통과**.20개 전체 상세의 WebP·본문·비율/자연 크기·닫기/초점·회차/획득 원장 불변 검사. 신규12개 상세는 **영구 도감 픽스처로 표시를 검수**했으며 실제 플레이로 획득했다고 주장하지 않는다. [개발 UI](v4.4/gallery-ui.log), [실제 하위 경로 빌드 UI](v4.4/base-gallery-ui.log).
- 현재8개는 실제 시작/선택→후속 서술→최초 엔딩→방문 회상→독백→마지막 카드→도감 상세→새로고침/다음 회차를 PC/모바일에서 진행했다. phase0/phase3/도감 이미지가 같고 마지막 완료 전에는 도감이 잠겨 있다. 관련4개 통과. [실제8엔딩 로그](v4.4/legacy-endings-ui.log).
- `npm run build` 타입/콘텐츠/원작34엔딩·현재5,328경로/8엔딩/빌드 통과. [로그](v4.4/build.log). `/demon-king-life/` base 빌드도 통과했다. [하위 경로 빌드](v4.4/base-build.log).
- 루트와 `/demon-king-life/` 각각20개 매핑/19파일의 HTTP200·image/webp·RIFF/WEBP·원본 바이트 동일 통과. [루트](v4.4/root-image-http.json), [하위 경로](v4.4/subpath-image-http.json). GitHub 실제 공개 배포 파일 검증과는 구분한다.
- 서로 다른 출처의 실제 HTTP 블로그형 부모 페이지에서 iframe으로 하위 경로 빌드를 실행했다. PC1280×900/모바일390×844에서 WebP가 부모가 아닌 게임 출처의 올바른 하위 경로로 요청되고 HTTP200/contain/자연 크기임을 확인했다. [로그](v4.4/iframe.log). 실제 티스토리 글 주소/게시 설정은 제공되지 않아 그 글의 CSP/sandbox까지 검사한 것은 아니다.
- 고정된 최신 하위 경로 빌드에서 PC1280×900/모바일320×568·360×800·390×844·430×932 × 12장면 × 스크롤/페이지 = **120조합** 통과. 글자150%, 본문 전체 표시, 상단 한 줄 능력치/연대기, 선택 팝업, 그림 원본 비율·크기 상한, 페이지 오버플로, 저장 원장을 검사했다. [레이아웃 로그](v4.4/layout-check.log).

## 실패 원인과 수정

- 첫 브라우저 검수는 Playwright worker에서 앱의 JSON import 모듈을 직접 읽어 Node import attribute 오류가 났다. 앱 실행 오류가 아니며, 테스트 기대값을 원본 JSON에서 읽도록 고쳤다. 이후4개 모두 통과. [초기 검수](v4.4/initial-gallery-setup.log).
- 일회성 HTTP 검수는 Playwright가 임시 개발 서버를 이미 종료한 뒤 실행해 ECONNREFUSED가 났다. 지속되는 실제 빌드 preview 서버에서 재검증해 루트/하위 경로 모두 통과했다.
- 첫 iframe 목업은 응답 가로채기로 만든 가상 부모가 브라우저의 로컬 네트워크 접근 검사에 걸렸다(`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`). 브라우저 보안을 끄지 않고 실제 Node HTTP 부모 서버를 사용해 양쪽 화면 통과했다. [초기 오류](v4.4/initial-iframe-mock.log), [그림](v4.4/iframe-first-failure.png).
- 추가 레이아웃 검수를 루트 preview에서 실행하는 동안 전체 회귀의 마지막 빌드가 dist를 교체해 일시적인 HTTP 응답 실패가 났다. PC/320px 검사에는 통과한 상태였으며 별도 고정 하위 경로 빌드에서 전체 검사를 다시 실행했다. 앱 코드를 추측 수정하지 않았다. [초기 로그](v4.4/initial-layout-build-race.log).

## 진행 중 / 미해결

1. 신규12개의 준비 사건/최종 선택/연간 흐름 연결은 별도 범위 확인 중이다. 현재 도감20개 표시/19이미지 로딩 성공을20개 엔딩 실플레이 완성으로 바꾸어 기록하지 않는다. ending_mina_wedding/ending_king/ending_true_demon 실제 도달은 미검증이다.
2. 전체 회귀377개와 빌드는 통과했다. 공개 배포/공개 HTTP 검증은 하지 않았다. 현재 공개 링크는 기존v3.8 판이다.
3. 기존8개 장면 재사용/신규12개 합성 시안은 전용 원화 작업이 남는다. 실제 휴대기기/Safari/Firefox 및 실제 티스토리 게시 글은 미검증이다.
4. 누적 ZIP의65개 재집필·연간 단문325개·12개 루트 설계는 보존/검토 입력이다. 이번 도감 승인만으로 기존 스토리/연간 엔진 전체를 교체하지 않는다. 집필22/65 기준도 미검수 원고로 임의 갱신하지 않는다.
