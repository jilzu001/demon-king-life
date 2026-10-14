import { validateSchema } from './schema';
import { ensure, type Story } from '../engine/types';

export type CompactCinematics = {
  schemaVersion: 1;
  endings: Record<string, { finalScene: string; reflection: string; illustration: string }>;
  replayRules: { onlyVisitedEvents: true; minEvents: number; maxEvents: number; showStageLabels: false };
};
export function validateCinematics(story: Story, data: unknown): CompactCinematics {
  validateSchema('compactCinematics', data);
  const cinematic = data as CompactCinematics;
  ensure(Object.keys(cinematic.endings).sort().join('|') === Object.keys(story.endings).sort().join('|'), '결말 연출의 엔딩 ID 범위가 본편과 다릅니다.');
  for (const value of Object.values(cinematic.endings)) ensure(value.finalScene.trim() && value.reflection.trim(), '빈 결말 연출 문구');
  return cinematic;
}
