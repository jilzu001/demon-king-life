# v4.6 분기 트리·승인 그림체 적용 기록

기준: 2026-10-16. 시작 main f76c1e7(직전 게임4658981), 작업 feature/v4.6-tree-art → main. 최종 게임 bbc2ac8, 구현·배포·공개 검증 완료. ZIP 원본은 변경하지 않고 spec/content-v4.6-tree-art/에16파일을 경로 이탈 검사 후 추출했다.

## 범위와 보호

- README_FIRST, CODEX_COPY_PASTE_PROMPT, docs01~06을 현재 저장소/정사와 비교했다. 본문 UI 리디자인은 범위 밖이며 스토리·119선택 계약·20엔딩·저장 스키마·도감/주마등 기록을 유지한다.
- 도감 버튼→전체 화면 트리/우하단 미니맵/사건 상세/찾기/닫기 복귀 구성은 사용자가 “이 구성으로 진행”으로 승인했다. 본문 화면 구성은 유지한다.
- 집필 변경 없음. 집중 집필23/65·보완42(35.4%)를 유지한다.

## 트리 데이터 조사

- 제공 generate-ending-tree/validate-tree를 현재 docs/v4.5/actual-ending-paths.json과3챕터에 실행했다.20개 엔딩의 실제 대표 경로에서101노드/100연결을 생성했고 구조 검증 통과.
- 제공 tree-camera.test.mjs의 카메라 역변환/줌 기준점/전체 맞춤/미니맵4개 통과. 실제 스토리 조건/판정/중간 저장 재현 검사는 scripts/verify-ending-tree.ts에서 별도로 수행한다.
- 전체 가능한 분기를 전부 나타내는 그래프가 아닌 엔딩당 한 가지 검증된 수집 예시의 prefix 트리다. 연간325개 기록은 선택 노드로 만들지 않는다.

## 원화 조사·제작

- ZIP의 재고 CSV는 과거 아카이브71개이므로 현재 공개 WebP182개를 직접 조사했다. [교체 전 재고](v4.6/art-inventory.csv)에 원본 SHA256/바이트/해상도와 대상 작업/조건/검수 상태를 보존했다. 작은 UI·표정 아이콘은 대상에서 제외한다.
- 최종 기준은 APPROVED_birth_reference.webp다. 부모·검은 머리 신생아·안경 서기관4명의 승인 원화를 실제 확인했다. 무관한 성인 주인공/미나를 부모로 그리지 않는다.
- imagegen 스킬의 기본 내장 도구로 개별 독립 원화를 제작한다. API/CLI로 전환하거나 인물 시트를 잘라 붙이지 않는다. [187개 개별 제작 프롬프트](v4.6/art-jobs.json), [생성 원본 파일 기록](v4.6/art-generation-results.json), [실제 설치/해시/용량](v4.6/art-installed.json). 승인 출생 원화1개는 제작 작업 수에 더하지 않는다.
- 초기 기준 초상화5개를 대조해 은발/푸른 눈 미나, 흑발 주인공, 금발 왕녀, 회색 머리·수염 국왕, 짧은 짙은 머리/안경 감사관의 정체성·화풍을 확인했다. 원화 생성 수와 실제 게임에서 교체된 WebP 수는 구분한다. 실제 검수·적용187개(신규 생성186+승인 출생1),6,836,526바이트다. 감정별120·기본/나이22·엔딩20·사건15·배경9·승인 출생1을 적용했다. [이미지별 검수·용량·미완료](v4.6/ART_AUDIT.md). 현재 실행 사건에 없는 truth_evidence만 미검수/미연결로 남겼다.

## 초기 문제·대응

- 첫 ZIP 문서 출력은 Windows Python cp949 출력으로 한글이 깨지고 유니코드 문자에서 중단됐다. 파일 내용은 UTF-8 정상이며 PowerShell Get-Content/UTF-8 명시 출력으로 읽었다. ZIP/원문을 다시 인코딩해 훼손하지 않았다.
- 청년 기준 초상화를 참조한 중년 감정 변형이 너무 젊게 생성돼 묶음을 중단했다. 단일 나이의 실제 검수된 얼굴을 기준으로 다시 제작한다. 노년 미나·감사관 외형·12세 미나 의상·고백의 불확실성 문제도 검수 후 재제작했다. [보류 근거](v4.6/art-review.json).
- 그림 앵커가 연간 기록의 같은 단어에 먼저 붙을 수 있었다. `illustrateNarrative`에서 연간 문단을 제외하고 새 CG는 실제 사건 본문의 첫 문단 뒤에만 둔다. 1~11세 기록에서12세 그림이 숨겨지는 회귀 검사를 추가했다.
- 개발 서버 검사 중 메타데이터 갱신/HMR과 겹친1개는 고정 빌드로 재확인했다. 초기 획득 트리 검사의 잘못된 테스트 선택 ID도 실제 검증 경로(refuse→burn_office)로 수정했다. 엔진의 분기를 바꾸지 않았다.

- 최종 전체 검사에서 보관 원작PC/모바일의 구128px 기대값2개가 실패했다. 실제256px WebP로 교체한 규격과 맞지 않는 검사였다. 게임 코드는 바꾸지 않고256px·각30KB 미만/배경200KB 미만/120개+배경2MB 미만의 저용량 검사를 적용했다. 수정 후 해당2개와 서버 전체 재검증이 모두 통과했다.

## 실제 구현 파일

- `src/ui/ending-tree.ts`, `ending-tree-layout.ts`, `tree-camera.ts`, `src/styles/ending-tree.css`: 독립 도감 트리, 고정 위치/카메라 이동·핀치·미니맵, 목표 찾기·옵트인 힌트·획득 상세·방문 분기 재선택. 기존 재선택 백업/확인 절차를 재사용한다.
- `src/ui/ending-gallery.ts`, `src/app/main.ts`: 도감 버튼/종료 연결과 현재 표시 나이에 맞는 주인공 초상화. 본문 UI 배치는 유지한다.
- `scripts/generate-ending-tree.mjs`, `validate-tree.mjs`, `verify-ending-tree.ts`, `src/content/generated/ending-tree.json`: 실제20경로 데이터와 조건·판정·중간 저장 재현.
- `src/ui/illustrations.ts`, `visual-identity.ts`, `src/content/art-v46.ts`, `ending-gallery.ts`, `src/content/generated/*art*.json`, `public/assets/*manifest*.json`: 검수한 실제 파일·조건·나이·동일 엔딩 매핑만 연결. 엔딩/도감의 잘못된 벡터 대체는 허용하지 않는다.
- `scripts/install-v46-art.py`, `sync-v46-art-metadata.py`, `verify-v46-art.mjs`: 저용량 변환·실제 크기/해시/공개 경로 일치. 생성 원본은 Git/배포 입력 밖의 art-source-v46에 보관한다.
- 관련 단위/실제 플레이/레이아웃 검사와 [이미지별 원장](v4.6/art-audit-final.json). 보호 대상35파일의 스토리·엔진·저장 계약은 바이트 동일하다.

## 최종 검증

- 로컬 타입/단위263개·콘텐츠·현재91,664종단 경로/경고0·트리20경로·최종 `npm run build` 통과. 전체 `npm run check`의 브라우저236개 중233개 통과/터치 전용PC1개 제외, 구128px 기대값2개 실패 후 규격·용량 검사 수정 및 해당2개 재검증 통과. 로컬 전체 명령의 최초 종료1을 숨기지 않으며, 최종 동일 커밋 bbc2ac8의 서버 `npm run check`가498개(263단위+235브라우저) 통과/PC 터치1개 제외·타입/콘텐츠/분기/빌드 성공으로 완료됐다. [전체 최초 로그](v4.6/check-final.log), [초상화2개 재검증](v4.6/portrait-regression-final.log), [최종 빌드](v4.6/build-final.log).
- 최종 고정 빌드에서 DPR2·150% 글자·5화면×12장면×스크롤/페이지=120레이아웃과 다른 출처 HTTP iframe PC/모바일 통과. [레이아웃](v4.6/layout-final.log), [iframe](v4.6/embed-local.log). 연간 앵커 오류 수정도 PC/모바일2개 별도 검사 통과.
- 현재 스토리·엔진·저장·준비 콘텐츠35개 파일은 f76c1e7과 바이트 동일하다. [파일별 해시](v4.6/protected-runtime.json). 기존182개 중143개를 같은 경로에 교체하고39개를 그대로 보관했으며 삭제0개다. 전체 공개226WebP/7,358,254바이트·최대193,116바이트를 HTTP200/RIFF/바이트 일치로 검사했다. [로컬 HTTP 결과](v4.6/http-local-final.json).

## 미완료와 검증 한계

- 원화 생성 실패로 남은 공개 대상은 없다. 다만 truth_evidence는 현재44사건에 없는 계획 항목이라 생성 원화를 미검수/미연결로 보류했다. 프롬프트는 art-jobs.json의 같은 ID에 보존했다.
- 트리는20개 대표 수집 경로이며 전체 가능한 모든 분기 조합을 전부 시각화하지 않는다. 잠긴 결말/이미지는 힌트를 켜도 계속 숨긴다.
- 실제 휴대기기·Safari/Firefox·실제 티스토리 게시물은 미검증이다. PC/모바일 세로 Chromium 계열 뷰포트와 다른 출처의 HTTP iframe 검증을 구분한다.

## 배포·공개 검증 완료

- 게임 bbc2ac8 / [Actions38823548978](https://github.com/jilzu001/demon-king-life/actions/runs/38823548978): 서버 `npm run check`498개(263단위+235브라우저)/PC 터치1개 제외, 타입·콘텐츠·분기·빌드·Pages 성공. [서버 로그](v4.6/server-build.log), [최종 요약](v4.6/verification-final.json).
- [공개 게임](https://jilzu001.github.io/demon-king-life/)에서85개 실제 클릭 통과/PC 터치1개 제외.20엔딩×PC/모바일40경로, 트리11검사, 확장·연간·CG·주마등34개다. [공개 플레이](v4.6/public-play-final.log), [도달 경로별 결과](v4.6/public-ending-routes/).
- 전체226WebP·20엔딩 공통 매핑·장면 매핑 HTTP200/원본 바이트 일치와 공개 URL의 다른 출처 HTTP iframe PC·모바일 검수 통과. [이미지 HTTP](v4.6/http-public-final.json), [공개 iframe](v4.6/embed-public.log).
- 기존 로컬 미리보기4177도 최종 dist로 갱신하고226개 HTTP/바이트 일치를 확인했다. [미리보기](v4.6/http-preview-4177.json).
- [구현 커밋 수정447파일 목록](v4.6/changed-files.json), [이미지별 검수/용량/미완료](v4.6/ART_AUDIT.md). 이후 커밋은 검증 기록만 갱신한다.
