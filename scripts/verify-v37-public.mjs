import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.argv[2] ?? 'http://127.0.0.1:4175/';
const audit = JSON.parse(await readFile('docs/V3_7_VISUAL_AUDIT.json', 'utf8'));
const files = audit.rows.filter(row => row.publicPath).map(row => row.publicPath);
files.push(...['story.json', 'characters.json', 'endings.json', 'ending_cinematics.json', 'chapters/01_complete.json'].map(path => `stories/demon-king-compact/${path}`));
files.push('assets/assets.json', 'assets/main_screen_illustration_policy.json', 'assets/scene_illustration_overrides_v3_6.json');
for (let start = 0; start < files.length; start += 8) {
  const results = await Promise.allSettled(files.slice(start, start + 8).map(async path => {
    const source = await readFile(`public/${path}`);
    const url = new URL(path, base); url.searchParams.set('v37-audit', createHash('sha256').update(source).digest('hex').slice(0, 12));
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path}: HTTP${response.status}`);
    if (!Buffer.from(await response.arrayBuffer()).equals(source)) throw new Error(`${path}: 배포 바이트 불일치`);
  }));
  for (const result of results) if (result.status === 'rejected') throw result.reason;
}
console.log(`${files.length}개 파일 HTTP200/로컬 원본 바이트 일치: 이미지167개+스토리5개+정책3개 (${base})`);
