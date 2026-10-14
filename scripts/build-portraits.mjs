import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const sharpPath = process.argv[2]; if (!sharpPath) throw new Error('설치된 Sharp 패키지 경로가 필요합니다.');
const sharp = createRequire(pathToFileURL(sharpPath))(sharpPath);
const { sheets } = JSON.parse(await readFile('docs/portrait-prompts-v2.json', 'utf8'));
const ages = ['early', 'middle', 'mature', 'old'];
const emotions = ['joy', 'sad', 'angry', 'tired', 'confused', 'neutral'];
await mkdir('public/art/portraits', { recursive: true });
const assets = []; let originals = 0;
for (const sheet of sheets) {
  const image = sharp(sheet.source); const meta = await image.metadata(); originals += (await stat(sheet.source)).size;
  if (!meta.width || !meta.height) throw new Error(`이미지 크기를 읽지 못했습니다: ${sheet.name}`);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 4; col++) {
    const left = Math.floor(col * meta.width / 4), top = Math.floor(row * meta.height / 6);
    const width = Math.floor((col + 1) * meta.width / 4) - left, height = Math.floor((row + 1) * meta.height / 6) - top;
    const file = `public/art/portraits/${sheet.name}-${ages[col]}-${emotions[row]}-v2.webp`;
    await image.clone().extract({ left, top, width, height }).resize(128, 128, { fit: 'cover' })
      .webp({ quality: 45, effort: 6 }).toFile(file);
    const data = await readFile(file);
    assets.push({ character: sheet.name, age: ages[col], emotion: emotions[row], file, width: 128, height: 128, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
  }
}
const bytes = assets.reduce((sum, item) => sum + item.bytes, 0);
if (assets.length !== 120 || new Set(assets.map(a => a.sha256)).size !== 120) throw new Error('초상화 개수/중복 검사 실패');
if (bytes > 250000) throw new Error('초상화 전체 용량이 250KB를 초과했습니다.');
const report = { requested: 100, neutral: 20, total: 120, bytes, maxBytes: Math.max(...assets.map(a => a.bytes)), originalBytes: originals, assets };
await writeFile('docs/portrait-assets-v2.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ requested: report.requested, neutral: report.neutral, total: report.total, bytes, maxBytes: report.maxBytes, originalBytes: originals }));
