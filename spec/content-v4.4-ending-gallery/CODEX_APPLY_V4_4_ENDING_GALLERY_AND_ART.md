# v4.4 엔딩 도감 상세 보기 + WebP 연결 수정 (누적 v4.3 기준)

## 확인된 원인 / 범위
- **실제 게임 저장소는 이 누적 패키지에 포함되지 않는다**. 현재 게임에서 벡터가 왜 계속 뜨는지는 런타임 코드 확인 전까지 단정 불가.
- v4.3 `ending_cinematics.json` 기존 8개 엔딩 `illustration`은 `sunset`, `scroll` 등 **레거시 토큰**이었고, 신규 12개는 실제 WebP 경로다.
- v4.3 그림 12개 및 오래된 그림 8개는 정적 파일로 존재한다. v4.4에서 기존 8개를 기존 WebP와 **명시적으로 연결**했다. 새 원화가 아니라 장면 재사용인 8개는 품질 검수 필요.
- 도감용 신규 데이터 `content/ending_gallery_v4_4.json`, 단일 이미지 매핑 `assets/ending_art_manifest_v4_4.json`.
- 재사용 경로 `ending_cinematics.json` 20개는 모두 실제 `.webp` 경로. 종전 토큰은 `legacyIllustrationKey`에 기록용으로만 남겼으며 화면에 출력하면 안 된다.

## Codex가 반드시 할 작업 (현재 repo 최신 상태 우선)
1. 현재 저장소의 실제 도감 / 엔딩 연출 / SVG 생성 루틴 / 이미지 경로 / 저장 데이터 구조를 먼저 검색하고 변경 대상 파일을 식별한다. 전체 덮어쓰기 금지.
2. 도감 항목에 `ending.id`로 연결된 버튼을 제공한다. 해금된 항목을 누르면 원본 WebP, 제목, 1문장 설명, 결말 본문이 표시되고 닫기 버튼으로 목록으로 돌아간다. **잠긴 항목은 이름·본문·그림 모두 공개하지 않는다.**
3. `web/EndingGalleryV44.tsx` 와 `web/ending-gallery-v4-4.css`는 React UI 참고 및 이식용이다. 엔진 프레임워크가 React가 아니면 동등한 DOM/UI 코드로 번역한다. 기존 도감 UI를 이중으로 남겨 두지 않는다.
4. 실제 잠금 해제 값은 엔진의 **영구 저장된 획득 엔딩 ID 목록**을 사용한다. 저장 자료가 다른 형식이면 읽기 어댑터를 만든다. `unlockedEndingIds`를 테스트용 고정 배열로 배포하지 않는다. 구버전 저장 마이그레이션 시 기존 획득 엔딩을 보존한다.
5. **모든 엔딩 이미지 참조를 한 곳에서 해결**한다. `assets/ending_art_manifest_v4_4.json`의 `artByEndingId`가 단일 출처다. 실시간 엔딩, 주마등 마지막 카드, 엔딩 도감 상세 보기에서 같은 `endingId`로 매핑한다.
6. 구 레거시 벡터/SVG 엔딩 카드 생성 함수는 최종 이미지 렌더링 우선순위에서 제거한다. `cinematic.illustration`이 구 토큰이어도 강제 벡터로 해석하지 않는다. 신규 이미지 404일 경우 **텍스트만 표시하고 잘못된 벡터 그림으로 대체하지 않는다.** 다만 주마등의 방문 장면별 이미지 시스템은 보존한다.
7. 배포 경로: WebP는 실제 프런트엔드의 `public/assets/...` 또는 동등한 정적 폴더에 복사. GitHub Pages 프로젝트 경로(`/repo/`)와 티스토리 임베드 경로를 고려해 `assetBaseUrl`를 배포 환경의 base URL에서 가져온다. 코드에서 `/assets/..` 절대경로 하드코딩 금지.
8. 이미지는 `max-width:100%`, `width:auto`, `height:auto`, `object-fit:contain`, `max-height:360px`; 원본 해상도보다 업스케일 금지. `<img onError>`에서 텍스트 fallback, 외부 네트워크 이미지 URL 삽입 금지.
9. 이미지 연결 전 20개 파일 경로를 실제 파일 존재와 일치시킨 뒤 미리보기 및 실제 실행 테스트. 확인 사례: `ending_peace`, `ending_love_scandal`, `ending_mina_wedding`, `ending_king`, `ending_true_demon` 각 1회 도달. Chrome DevTools Network에서 HTTP 200/WebP, 화면에 SVG 없음. 잠김/해금, 모바일, 새로고침, 저장 복귀 확인.
10. 엔딩 획득은 끝까지 실행한 뒤에만 기록한다. 단순 조건 충족, 도감 열기 또는 미리보기로 획득 처리 금지.
11. 프로젝트 사용 중인 라이브러리/프레임워크 및 asset pipeline을 존중한다. 빌드/테스트 실패 시 엔진 수정 완료를 주장하지 말고 원인 보고.

## 데이터 보존
- v4.3 엔딩 20개 ID와 본문, 진입 루트, 스토리, 연간 단문 325개, 기존 이미지, 선택지 모두 보존.
- v4.4의 엔딩 8개 WebP는 **기존 보유 일러스트 재사용**이므로 전용 그림이 아님. 일부는 장면과 정확히 일치하지 않을 수 있으니 추가 원화 작업 백로그로 둔다.
- v4.3 12개 엔딩 이미지는 원본 정체성 고정 합성 시안이며 독립 원화가 아니라는 점을 표기한다.

## 사용 예 (React 프로젝트인 경우, 개략)
```tsx
import data from './content/ending_gallery_v4_4.json';
import { EndingGalleryV44 } from './web/EndingGalleryV44';
// 실제 저장소에서 영구 저장된 해금 엔딩 ID를 취득해 전달한다.
<EndingGalleryV44
  entries={data.endings}
  unlockedEndingIds={actualSave.unlockedEndingIds}
  assetBaseUrl={import.meta.env.BASE_URL}
/>
```
`import.meta.env.BASE_URL`은 Vite 기준 예이며 다른 도구일 경우 맞게 변환.

## 실제 엔딩 연출 연결 (중요)
```ts
const endingArtwork = artManifest.artByEndingId[endingId];
// 기존 SVG/receipt/vector renderer보다 우선: artPath 검사 → WebP <img> → 텍스트 fallback
// no fallback to legacy vector art
```

## 검증
- `python audit/validate_ending_gallery_v4_4.py`로 패키지 내부 데이터/이미지/구 토큰 제거를 확인.
- `demo/ending_gallery_preview.html`은 압축을 푼 뒤 브라우저에서 열어 UI를 확인하는 데모. 데모의 '20개 획득 보기'는 **미리보기 전용 기능**, 실제 게임에 배포 금지.
