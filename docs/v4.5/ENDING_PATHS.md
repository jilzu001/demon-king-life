# v4.5 엔딩별 실제 선택 경로

새 게임에서 아래 선택 ID를 순서대로 클릭해 도달하는 대표 경로다. 강제 엔딩 주입은 사용하지 않는다. 모든 가능한 경로는 전수 분기 검사에서 별도 확인했다. 기존8개/신규12개 구분과20개 공식 그림 연결은 그대로다. PC·모바일 브라우저 검사에서는 선택 후 서술, 저장 복원, 주마등, 마지막 카드 해금과 도감 상세까지 확인한다.

| 엔딩 | 마지막 나이 | 실제 선택 순서 |
| --- | --- | --- |
| ending_escape · 계단 열일곱 개의 마왕 | 21세 | `family_accept` → `trust_mina` → `attack` → `escape_prison` |
| ending_fire · 불타 버린 진실 | 21세 | `family_accept` → `trust_mina` → `refuse` → `burn_office` |
| ending_throne · 왕에게 삿대질한 마왕 | 21세 | `family_accept` → `trust_mina` → `invoice` → `threaten_king` |
| ending_ledger · 빈 장부의 주인 | 41세 | `family_accept` → `trust_mina` → `attack` → `forgive` → `ally` → `steal_ledger` |
| ending_peace · 그냥 인간의 승리 | 65세 | `family_accept` → `trust_mina` → `attack` → `forgive` → `ally` → `public_audit` → `walk_away` → `end_peace` |
| ending_reform · 법전을 고친 마왕 | 60세 | `family_accept` → `trust_mina` → `attack` → `forgive` → `ally` → `public_audit` → `fight_case` → `reject_money` → `end_reform` |
| ending_office · 국가가 만든 적의 반격 | 62세 | `family_accept` → `trust_mina` → `attack` → `forgive` → `ally` → `public_audit` → `fight_case` → `buy_office` → `end_office` |
| ending_love_scandal · 사랑은 합격하지 못했다 | 20세 | `family_accept` → `trust_mina` → `confess` → `confess_absurd` → `embrace_fame` |
| ending_mina_renounced · 용사를 포기한 용사 | 55세 | `family_accept` → `trust_mina` → `confess` → `confess_sincere` → `support_mina` → `explore_route_mina_renounced` → `commit_route_mina_renounced` → `route_mina_renounced_stay` |
| ending_mina_wedding · 마왕의 결혼식 | 65세 | `family_accept` → `trust_mina` → `confess` → `confess_sincere` → `support_mina` → `explore_route_mina_wedding` → `commit_route_mina_wedding` → `route_mina_wedding_challenge` |
| ending_confession_unanswered · 평생 답을 듣지 못한 고백 | 65세 | `family_accept` → `trust_mina` → `confess` → `confess_sincere` → `leave_mina` → `keep_records` → `explore_route_confession_unanswered` → `commit_route_confession_unanswered` → `route_confession_unanswered_listen` |
| ending_common_enemy · 우리의 적은 서로가 아니었다 | 60세 | `family_accept` → `trust_mina` → `refuse` → `keep_records` → `tell_mina` → `explore_route_common_enemy` → `commit_route_common_enemy` → `route_common_enemy_publish` |
| ending_double_license · 국가 공인 용사이자 마왕 | 36세 | `family_accept` → `mina_rival` → `refuse` → `keep_records` → `explore_route_double_license` → `commit_route_double_license` → `route_double_license_claim` |
| ending_retirement_47 · 마왕 퇴직금 47골드 | 47세 | `family_invoice` → `trust_mina` → `attack` → `forgive` → `ally` → `public_audit` → `explore_route_retirement_47` → `commit_route_retirement_47` → `route_retirement_47_collect` |
| ending_paid_defeat · 토벌당하는 게 직업입니다 | 54세 | `family_accept` → `trust_mina` → `invoice` → `accept_invite` → `explore_route_paid_defeat` → `commit_route_paid_defeat` → `route_paid_defeat_coach` |
| ending_taxpayer · 왕국 최고의 납세자 | 65세 | `family_accept` → `trust_mina` → `invoice` → `accept_invite` → `ally` → `explore_route_taxpayer` → `commit_route_taxpayer` → `route_taxpayer_receipt` |
| ending_king · 마왕, 국왕이 되다 | 60세 | `family_accept` → `trust_mina` → `attack` → `forgive` → `ally` → `public_audit` → `explore_route_king` → `commit_route_king` → `route_king_abolish` |
| ending_bankrupt · 왕국을 파산시킨 마왕 | 60세 | `family_accept` → `trust_mina` → `attack` → `forgive` → `ally` → `public_audit` → `explore_route_bankrupt` → `commit_route_bankrupt` → `route_bankrupt_protect` |
| ending_true_demon · 진짜 마왕을 발견했다 | 53세 | `family_accept` → `trust_mina` → `attack` → `forgive` → `ally` → `public_audit` → `explore_route_true_demon` → `commit_route_true_demon` → `route_true_demon_evacuate` |
| ending_mother_petition · 내 아들은 마왕이 아닙니다 | 65세 | `family_appeal` → `trust_mina` → `attack` → `forgive` → `ally` → `explore_route_mother_petition` → `commit_route_mother_petition` → `route_mother_petition_read` |

상세 결말/이미지 경로/중간 저장 재현 결과는 [JSON 원본](actual-ending-paths.json), 실행 결과는 [전체 검사](check.log)를 확인한다. 공개 배포 검증 결과는 [상위 보고서](../V4_5_APPLY.md)에 기록한다.
