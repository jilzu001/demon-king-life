import { validateSchema } from './schema';
import { ensure, type Story } from '../engine/types';
import type { CompactCinematics } from './cinematics';

export type ScenePresentation = { chronicleSummary: string; locationLabel?: string; dialogues?: { speaker: string; text: string }[] };
export type Presentation = { schemaVersion: 1; storyId: string; storyVersion: string; nodes: Record<string, ScenePresentation> };
export type PresentedStory = Story & { presentation?: Presentation; presentationWarning?: string; cinematics?: CompactCinematics };
export function validatePresentation(story: Story, data: unknown): Presentation {
  validateSchema('presentation', data);
  const presentation = data as Presentation;
  ensure(presentation.storyId === story.manifest.id && presentation.storyVersion === story.manifest.version, '표시 데이터의 스토리/버전이 일치하지 않습니다.');
  ensure(Object.keys(presentation.nodes).sort().join('|') === Object.keys(story.nodes).sort().join('|'), '표시 데이터의 장면 ID/요약 범위가 본편과 다릅니다.');
  for (const value of Object.values(presentation.nodes)) {
    ensure(value.chronicleSummary.trim().length >= 5, '빈 연대기 요약');
    for (const line of value.dialogues ?? []) ensure(line.speaker.trim().length && line.text.trim().length, '빈 화자/대사');
  }
  return presentation;
}
