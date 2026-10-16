import manifest from '../../backups/before-v4.8/story.json';
import chapter1 from '../../backups/before-v4.8/chapters/01_complete.json';
import chapter2 from '../../backups/before-v4.8/chapters/02_ending_routes.json';
import chapter3 from '../../backups/before-v4.8/chapters/03_v45_expansion.json';
import characters from '../../backups/before-v4.8/characters.json';
import endings from '../../backups/before-v4.8/endings.json';
import cinematics from '../../backups/before-v4.8/ending_cinematics.json';
import { assembleStory } from './validate';
import { validateCinematics } from './cinematics';
// 실제 배포된44사건 계약. 구 회차의 원장·상태·난수·방문 이력을 끼워 넣거나 재작성하지 않는다.
const base = assembleStory(manifest, [chapter1,chapter2,chapter3], characters, endings);
export const preV48Story = { ...base, cinematics: validateCinematics(base, cinematics) };
