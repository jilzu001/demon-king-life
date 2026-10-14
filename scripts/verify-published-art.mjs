import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.argv[2] ?? 'http://127.0.0.1:4175/';
const { assets, bytes } = JSON.parse(await readFile('docs/portrait-assets-v2.json', 'utf8'));
let checked = 0;
for (let start = 0; start < assets.length; start += 8) {
  const results = await Promise.allSettled(assets.slice(start, start + 8).map(async asset => {
    const response = await fetch(new URL(asset.file.replace(/^public\//, ''), base));
    if (!response.ok) throw new Error(`${asset.file}: HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length !== asset.bytes || createHash('sha256').update(data).digest('hex') !== asset.sha256) throw new Error(`${asset.file}: 원본 불일치`);
  }));
  for (const result of results) { if (result.status === 'rejected') throw result.reason; checked++; }
}
const background = await fetch(new URL('art/background-v1.webp', base));
if (!background.ok) throw new Error('배경 요청 실패');
const backgroundData = Buffer.from(await background.arrayBuffer());
if (!backgroundData.equals(await readFile('public/art/background-v1.webp'))) throw new Error('배경 원본 불일치');
const gallery = await fetch(new URL('art/portraits/gallery.html', base));
if (!gallery.ok || !(await gallery.text()).includes('초상화')) throw new Error('초상화 모음 요청 실패');
console.log(`${checked}개 초상화 HTTP/크기/SHA-256 일치, 배경 일치, 모음 페이지 통과. 이미지 합계 ${bytes + backgroundData.length}바이트 (${base})`);
