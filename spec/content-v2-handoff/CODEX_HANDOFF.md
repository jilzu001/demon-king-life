# Codex 전달 지시 (초안 검토용)

1. 이 패키지는 v2.0 완성본이 아닌 중간본이다. 기존 v1.1 콘텐츠를 백업한다.
2. 별도 브랜치에서 JSON을 로드하고 schema 및 node/ending 연결을 검사한다.
3. PROGRESS_REPORT.json에 삭제된 선택지 목록이 있다. 삭제로 도달 불가능해진 엔딩을 계산하고 보고한다.
4. presentation.json의 dialogues는 존재할 때만 표시하고, 나머지는 기존 body를 보여준다.
5. 엔딩 도달성 검증 없이 본 패키지를 실서비스에 배포하지 않는다.
