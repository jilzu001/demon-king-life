import { readFile, writeFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// 창작 원본은 그대로 두고 웹 배포용 사본만 작은 WebP로 인코딩한다.
const sharpPath = process.argv[2];
if (!sharpPath) throw new Error('설치된 sharp 라이브러리 경로가 필요합니다.');
const require = createRequire(pathToFileURL(sharpPath));
const sharp = require(sharpPath);
const manifest = JSON.parse(await readFile('docs/art-prompts.json', 'utf8'));
const report = [];
for (const asset of manifest.assets) {
  const source = asset.originalSource ?? asset.originalFile ?? asset.file;
  const output = `public/art/${asset.name}-v1.webp`;
  const isBackground = asset.name === 'background';
  const before = await stat(source);
  await sharp(source).resize({ width: isBackground ? 1280 : 256, withoutEnlargement: true })
    .webp({ quality: isBackground ? 70 : 72, effort: 6 }).toFile(output);
  const metadata = await sharp(output).metadata(); const after = await stat(output);
  report.push({ name: asset.name, file: output, originalBytes: before.size, bytes: after.size, width: metadata.width, height: metadata.height });
  asset.file = output;
}
const originalBytes = report.reduce((sum, item) => sum + item.originalBytes, 0);
const bytes = report.reduce((sum, item) => sum + item.bytes, 0);
await writeFile('docs/art-prompts.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile('docs/art-optimization.json', JSON.stringify({ originalBytes, bytes, reductionPercent: +(100 * (1 - bytes / originalBytes)).toFixed(2), assets: report }, null, 2) + '\n');
console.log(JSON.stringify({ originalBytes, bytes, reductionPercent: +(100 * (1 - bytes / originalBytes)).toFixed(2), assets: report }));
