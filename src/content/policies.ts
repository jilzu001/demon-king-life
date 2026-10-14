import { ensure, type GameState, type HistoryEntry, type Story } from '../engine/types';
import { convictionsV11, isFullContent } from './legal-events-v11';

// JSON 문장만으로 판결을 추론하지 않는다. 작가가 검수한 v1 예제 판결 위치만 허용한다.
// 다른 작품/버전의 법적 이벤트는 별도 검수와 회귀 테스트 후 여기 등록해야 한다.
export function assertLegalTransition(story: Story, before: GameState, after: GameState, entry: HistoryEntry): void {
  const added = after.player.crimes.filter(crime => !before.player.crimes.includes(crime));
  for (const crime of added) {
    const approvedLegacy = story.manifest.id === 'demon-king' && story.manifest.version === '1.0.0'
      && entry.nodeId === 'dk21_trial' && entry.toKind === 'ending' && entry.toId === 'end_prison'
      && ((entry.choiceId === 'plead' && entry.outcomeId === 'prison') || (entry.choiceId === 'deny' && entry.outcomeId === 'caught_lie'))
      && crime === 'attempted_murder_convicted' && before.player.legalStatus === 'under_trial'
      && before.flags.includes('attempted_attack_on_mina') && after.player.legalStatus === 'imprisoned';
    const approvedFull = isFullContent(story.manifest.id, story.manifest.version, story.manifest.entryNodeId)
      && convictionsV11[`${entry.nodeId}/${entry.choiceId}/${entry.outcomeId}`] === crime
      && after.player.legalStatus === 'imprisoned';
    ensure(approvedLegacy || approvedFull, `검수된 판결 근거 없이 전과를 추가할 수 없습니다: ${crime}`);
  }
  for (const [id, npc] of Object.entries(after.npcs)) {
    const previous = before.npcs[id]!;
    if (npc.relationship === 'spouse' && previous.relationship !== 'spouse') {
      const approvedFullMarriage = isFullContent(story.manifest.id, story.manifest.version, story.manifest.entryNodeId)
        && id === 'erisia' && entry.nodeId === 'dk39_erisia_contract' && entry.choiceId === 'offer_marriage_legal'
        && entry.outcomeId === 'consented_marriage' && previous.trust >= 65 && after.flags.includes('married_erisia');
      ensure(approvedFullMarriage || (after.flags.includes('marriage_registered') && after.flags.includes(`marriage_consent_${id}`)
        && after.flags.includes('marriage_consent_player')), '동의와 혼인 등록 근거가 없습니다.');
    }
    if (npc.relationship === 'ex_spouse' && previous.relationship !== 'ex_spouse') {
      ensure(previous.relationship === 'spouse' && after.flags.includes(`divorce_finalized_${id}`), '이혼 신청만으로 배우자 관계를 종료할 수 없습니다.');
    }
  }
}
