// 2026-10-14 사용자 승인: 로엔의 처형 엔딩 해금 조건을 기존 국왕 대면 결말에 연결한다.
// 원본 JSON의 ID나 기존 엔딩을 바꾸지 않고 사건 조건을 읽을 때만 사용하는 별칭이다.
export const hybridEndingAliases: Readonly<Record<string, string>> = Object.freeze({
  ending_execution: 'ending_throne',
});
