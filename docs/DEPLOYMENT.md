# GitHub Pages 공개 배포 — 2026-10-14

- 게임: [가짜 마왕의 일생 플레이](https://jilzu001.github.io/demon-king-life/)
- 소스: [jilzu001/demon-king-life](https://github.com/jilzu001/demon-king-life)
- 첫 배포 검증: [성공한 Actions 실행](https://github.com/jilzu001/demon-king-life/actions/runs/38488632929)
- 첫 배포 커밋: `77857fc1d37eb179bae25501385e248c5ccca517`
- 콘텐츠: v1.1.0, 장면 98·선택 340·결과 363·엔딩 34.

## 배포와 갱신

이 프로젝트 폴더만 별도 Git 저장소로 만들었습니다. 다른 게임 저장소와 배포 주소는 수정하지 않았습니다. GitHub Pages의 게시 소스는 GitHub Actions입니다.

`.github/workflows/pages.yml`은 main 푸시/수동 실행에 다음 절차를 적용합니다.

1. Node.js 24와 `npm ci`로 잠금 파일 설치.
2. Chromium 설치 후 `npm run check`로 타입, 엔진 테스트, 원본 콘텐츠/표시 데이터, 전체 분기, PC·모바일 UI를 검사하고 빌드.
3. 모두 성공한 `dist/`만 Pages artifact로 업로드.
4. 검증 작업에 의존하는 배포 작업이 Pages에 게시. 배포 작업에만 Pages 쓰기와 OIDC 권한을 부여합니다.

PR은 검증만 실행하며 배포하지 않습니다. 워크플로에서 `VITE_BASE_PATH=/demon-king-life/`를 설정합니다. 로컬 서버는 루트 경로를 계속 사용하므로 바탕화면 아이콘의 포트 4175도 유지됩니다. 인증은 기존 Git Credential Manager를 사용했고 인증 토큰을 파일·로그·저장소에 넣지 않았습니다.

수정 후:

```powershell
npm run check
git add .
git commit -m '수정 내용'
git push origin main
```

Actions가 성공한 뒤 실제 게임 주소도 확인하세요. 빌드나 테스트가 실패하면 배포가 실행되지 않습니다. 문제가 있는 배포는 원인 수정 커밋이나 이전 상태로 되돌리는 정상 커밋을 사용합니다. 원격 이력을 강제로 덮어쓰지 않습니다.

## 실제 검증

| 항목 | 결과 |
|---|---|
| 로컬 `npm run check` | 전체 성공 |
| 단위/통합 | 96개 통과 |
| Edge 브라우저 | 36개 통과 |
| 반응형 | 320·360·390·430·768·1280px에서 가로 넘침 없음, 760px 이하 단일열/그 이상 2열 |
| GitHub Ubuntu/Chromium CI | 설치·전체 검증·빌드·artifact 업로드·배포 모두 성공 |
| 콘텐츠 전수 분기 | 대표 상태 8,175개, 장면 98/98·엔딩 34/34 도달, 경고 없음 |
| 공개 JSON | 매니페스트·인물·엔딩·presentation·챕터 4개, 총 8개 HTTP 200 및 로컬 원본과 바이트 일치 |
| 공개 주소 기본 진행 | PC 1280px/모바일 320px에서 대사·3회 연속 선택·진행 중 새로고침 복원 통과 |
| 공개 주소 엔딩 | PC/모바일 각각 조기 사망 `end_blade`, 19회 선택 후 `end_archivist_legacy` 종료와 새로고침 복원 통과 |
| 공개 주소 페이지 오류 | PC/모바일 모두 0개 |

공개 파일의 SHA-256 및 URL은 `deployed-content-check.json`에 있습니다. 로그인 없이 새 브라우저 컨텍스트로 플레이를 확인했습니다. 엔딩 이후 추가 선택지가 나타나지 않으며 다시 시작 버튼을 제공합니다.

## 저장과 확인 범위

이 게임은 브라우저 localStorage에 저장합니다. 기기·브라우저·접속 주소가 달라지면 저장도 분리됩니다. 이전 로컬 게임을 이어가려면 로컬의 설정에서 회차 JSON을 내보내고 공개 게임의 설정에서 가져옵니다. 구 예제 세이브도 그대로 이어갈 수 있으며 새 회차에는 v1.1이 적용됩니다. 로컬 세이브를 임의로 삭제하거나 서버로 전송하지 않았습니다.

실제 휴대기기에서의 터치/OS 확대와 Safari·Firefox는 확인하지 않았습니다. 모바일 UI는 Edge 및 Chromium의 화면 너비/모바일 에뮬레이션으로 검증했습니다.

참고한 공식 문서: [GitHub Pages 사용자 지정 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Pages REST API](https://docs.github.com/en/rest/pages/pages), [Node 설정 Action](https://github.com/actions/setup-node).

## 연대기 읽기 흐름 업데이트

연대기 순차 표시·클릭 가속·스킵을 추가한 로컬 검증은 단위/통합 96개와 브라우저 46개를 통과했습니다. 엔진/콘텐츠/저장 스키마는 그대로이며 기존 주소에 동일한 자동 검증/배포 절차를 적용합니다. 검증 범위와 해결한 문제는 `READING_UI.md`에 있습니다.

공개 배포 뒤 `npx tsx scripts/verify-reading-ui.ts https://jilzu001.github.io/demon-king-life/`로 새 읽기 순서·스킵·원장 보호·새 장면·엔딩 복원을 확인합니다. 현재 Actions 결과는 [워크플로 실행 목록](https://github.com/jilzu001/demon-king-life/actions)에서 확인할 수 있습니다.
