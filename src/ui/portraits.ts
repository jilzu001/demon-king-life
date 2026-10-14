export const portraitCharacters = ['player', 'mina', 'erisia', 'king', 'auditor'] as const;
export type PortraitCharacter = typeof portraitCharacters[number];
export const portraitStages = ['early', 'middle', 'mature', 'old'] as const;
export const portraitEmotions = ['joy', 'sad', 'angry', 'tired', 'confused', 'neutral'] as const;
export type PortraitEmotion = typeof portraitEmotions[number];

// NPC의 생년월일을 만들지 않는다. 작품 진행 나이에 따른 화면용 연령 단계다.
export function portraitStage(age: number) {
  return age < 35 ? 'early' : age < 50 ? 'middle' : age < 65 ? 'mature' : 'old';
}
export function portraitUrl(base: string, id: PortraitCharacter, age: number, emotion: PortraitEmotion = 'neutral') {
  return `${base}art/portraits/${id}-${portraitStage(age)}-${emotion}-v2.webp`;
}

// 제공된 대사의 화면 연출. 조건·결과·관계·NPC 심리 상태를 변경하지 않는다.
// 감정을 추측할 근거가 없는 대사는 기본 표정을 사용한다.
const cues: Record<string, readonly PortraitEmotion[]> = {
  dk20_exam: ['confused', 'confused', 'tired', 'neutral'],
  dk20_disarmed: ['angry', 'confused', 'confused', 'tired'],
  dk20_fraud_pitch: ['joy', 'sad', 'joy', 'angry'],
  dk20_legal_protest: ['angry', 'confused', 'neutral', 'tired'],
  dk20_public_confession: ['joy', 'confused', 'neutral', 'tired'],
  dk21_assault_trial: ['confused', 'neutral', 'angry', 'neutral'],
  dk22_prison: ['sad', 'neutral', 'angry', 'tired'],
  dk25_hero_centre: ['neutral', 'angry', 'neutral', 'tired'],
  dk25_newsroom: ['neutral', 'tired', 'confused', 'confused'],
  dk25_princess_meeting: ['neutral', 'joy', 'tired', 'confused'],
  dk26_mina_professional: ['neutral', 'confused', 'neutral', 'joy'],
  dk27_royal_banquet: ['angry', 'neutral', 'confused', 'angry'],
  dk29_register_review: ['neutral', 'tired', 'neutral', 'neutral'],
  dk30_budget_entry: ['neutral', 'confused', 'neutral', 'sad'],
  dk30_marriage_offer: ['neutral', 'joy', 'tired', 'confused'],
  dk34_budget_notice: ['neutral', 'confused', 'neutral', 'angry'],
  dk34_erisia_partnership: ['neutral', 'confused', 'tired', 'sad'],
  dk39_erisia_contract: ['neutral', 'confused', 'tired', 'confused'],
  dk39_mina_line: ['angry', 'neutral', 'tired', 'neutral'],
  dk39_succession_vote: ['neutral', 'confused', 'neutral', 'tired'],
  dk39_truth_hearing: ['neutral', 'confused', 'neutral', 'tired'],
  dk44_erisia_alliance: ['neutral', 'confused', 'neutral', 'confused'],
  dk44_investigation: ['neutral', 'angry', 'neutral', 'tired'],
  dk49_audit_chamber: ['neutral', 'neutral', 'neutral', 'confused'],
  dk49_public_hearing: ['neutral', 'neutral', 'neutral', 'joy'],
  dk49_settlement_desk: ['neutral', 'confused', 'neutral', 'joy'],
  dk55_audit_truth: ['neutral', 'confused', 'neutral', 'joy'],
  dk55_reform_victory: ['neutral', 'confused', 'neutral', 'joy'],
  dk71_final_review: ['neutral', 'sad', 'neutral', 'confused'],
};
export function dialogueEmotion(nodeId: string, index: number): PortraitEmotion { return cues[nodeId]?.[index] ?? 'neutral'; }
