import { parseJson } from './json';
import { validateSchema } from './schema';
import { assembleStory, safeContentPath } from './validate';
import { ensure, type Manifest, type Story } from '../engine/types';
import { validatePresentation, type PresentedStory } from './presentation';

export type JsonReader = (path: string) => Promise<unknown>;
export async function loadStory(read: JsonReader): Promise<Story> {
  const data = await read('story.json');
  validateSchema('story', data);
  const manifest = data as Manifest;
  const files = [...manifest.chapters, manifest.charactersFile, manifest.endingsFile].map(safeContentPath);
  const values = await Promise.all(files.map(read));
  return assembleStory(data, values.slice(0, manifest.chapters.length), values.at(-2), values.at(-1));
}
export async function loadBrowserStory(baseUrl: string, directory = 'demon-king'): Promise<PresentedStory> {
  ensure(['demon-king', 'demon-king-legacy-phase1'].includes(directory), '지원하지 않는 스토리 폴더');
  const read: JsonReader = async path => {
    const response = await fetch(`${baseUrl}stories/${directory}/${safeContentPath(path)}`, {
      cache: 'no-cache', ...(path === 'presentation.json' ? { signal: AbortSignal.timeout(2500) } : {}),
    });
    ensure(response.ok, `${path}: 콘텐츠 요청 실패 (${response.status})`);
    const bytes = await response.arrayBuffer();
    return parseJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), path);
  };
  const story: PresentedStory = await loadStory(read);
  try { story.presentation = validatePresentation(story, await read('presentation.json')); }
  catch (error) {
    story.presentationWarning = `추가 표시 데이터를 불러오지 못해 기존 본문과 실제 선택 기록을 표시합니다. ${error instanceof Error ? error.message : String(error)}`;
  }
  return story;
}
