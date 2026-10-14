import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadStory } from '../src/content/load';
import { parseJson } from '../src/content/json';
import { safeContentPath } from '../src/content/validate';
import { validatePresentation, type PresentedStory } from '../src/content/presentation';

export async function readExampleStory(directory = 'demon-king') {
  const root = new URL(`../public/stories/${directory}/`, import.meta.url);
  const read = async (path: string) => {
    const bytes = await readFile(fileURLToPath(new URL(safeContentPath(path), root)));
    return parseJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), path);
  };
  const story: PresentedStory = await loadStory(read);
  if (directory === 'demon-king') story.presentation = validatePresentation(story, await read('presentation.json'));
  return story;
}
