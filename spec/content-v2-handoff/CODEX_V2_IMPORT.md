# Codex 콘텐츠 적용 안내

이 ZIP은 **완성본이 아닌 통합 집필 진행본**입니다. 기존 파일을 백업하고 별도 브랜치에서 작업하세요.

- `chapters/*.json`: 본문에 대사 추가.
- `presentation.json`: 별도 대사 블록 포함. **중복 표시 금지**: 본문에 대사가 있으므로 UI에서 둘 다 렌더링하지 마세요.
- `ending_cinematics.json` 및 `ending_ui/`: 이전에 준비된 결말 연출 초안.
- `CONTENT_STATUS_V2.json`: 수작업 장면과 임시 대사 장면 구분.

현재 `v2Authored: false`인 장면은 대화가 들어 있더라도 웹소설 수준의 완성 콘텐츠가 아닙니다. 최종 출시 전에 전면 재집필해야 합니다.
