# 《가짜 마왕의 일생》 v4.4 누적 패키지

v4.3 전체 콘텐츠 + 도감 클릭 상세 UI(React 이식용) + WebP 엔딩 연결 20개 + 기존 8개 레거시 토큰 교체.

**중요:** 게임 엔진 원본 프로젝트는 이 ZIP에 포함되지 않으며, 실제 서비스 적용과 실행 검증은 Codex의 저장소 병합 작업이 필요합니다. v4.3까지의 신규 엔딩 12개도 엔진 통합 전입니다.

엔딩 전용 원화 20장이 들어 있는 것은 아닙니다. 신규 합성 임시 WebP 12장과 기존 보유 WebP 재사용 8개를 모두 실제 경로로 매핑했습니다.

- `content/ending_gallery_v4_4.json`: 엔딩별 설명, 결말 전체 본문, WebP 경로 20개
- `assets/ending_art_manifest_v4_4.json`: 단일 이미지 lookup
- `ending_cinematics.json`: 기존 8개 레거시 `illustration`을 WebP로 변경 (옛 식별자는 `legacyIllustrationKey`로만 보존)
- `web/EndingGalleryV44.tsx`, `web/ending-gallery-v4-4.css`: 클릭 상세 UI 제공
- `demo/ending_gallery_preview.html`: 브라우저용 검토 미리보기
- `CODEX_APPLY_V4_4_ENDING_GALLERY_AND_ART.md`: 엔진 병합/검증 절차
- `audit/validate_ending_gallery_v4_4.py`: 정적 검증 스크립트
