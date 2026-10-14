// v1.1 ZIP의 명시된 판결 결과 위치. 입력 JSON을 훑어 임의의 효과를 승인하지 않는다.
export const convictionsV11: Record<string, string> = {
  'dk21_assault_trial/plead_guilty/out_dk22_prison': 'attempted_murder_convicted',
  'dk21_assault_trial/accuse_mina/out_dk22_prison': 'attempted_murder_convicted',
  'dk22_fraud_press/destroy_records/out_end_archive_arson': 'archive_breakin_convicted',
  'dk25_forged_risk/sell_policies/caught_early': 'fraud_convicted',
  'dk25_civic_election/scare_voters/out_end_electoral_fraud': 'electoral_offense_convicted',
  'dk26_palace_informant/forge_evidence/out_end_fake_evidence': 'evidence_forgery_convicted',
  'dk27_insurance_empire/keep_swindling/audit': 'fraud_convicted',
  'dk27_local_office/skim_budget/audit': 'public_funds_fraud_convicted',
  'dk29_business_tribunal/hide_books/caught_books': 'fraud_convicted',
  'dk30_political_broker/accept_dirty_deal/audit_funding': 'political_bribery_convicted',
  'dk30_marriage_offer/fabricate_inheritance/out_end_fake_pedigree': 'fraud_convicted',
  'dk30_business_future/bill_state/billing_caught': 'procurement_fraud_convicted',
  'dk30_black_market/sell_fake_secret/caught_selling': 'forgery_convicted',
  'dk34_political_machine/bribe_delegates/caught_bribery': 'political_bribery_convicted',
  'dk39_press_court/fake_leak/out_end_false_scandal': 'defamation_convicted',
  'dk44_public_scandal/forge_mana/out_end_mana_deepfake': 'deception_convicted',
  'dk49_political_backlash/destroy_records_again/out_end_archive_repeat': 'obstruction_convicted',
};
export function isFullContent(storyId: string, version: string, entryNodeId: string): boolean {
  return storyId === 'demon-king' && ['1.0.0', '1.1.0'].includes(version) && entryNodeId === 'dk20_exam';
}
