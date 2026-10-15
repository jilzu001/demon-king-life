import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4175/');
const original = await readFile('public/assets/ending_art_manifest_v4_4.json');
const manifest = JSON.parse(original);
const manifestResponse = await fetch(new URL('assets/ending_art_manifest_v4_4.json', base), { cache: 'no-store' });
if (!manifestResponse.ok || !Buffer.from(await manifestResponse.arrayBuffer()).equals(original)) throw Error('공개 엔딩 매핑 불일치');
const checked = new Map();
for (const path of new Set(Object.values(manifest.artByEndingId))) {
  if (!/^assets\/illustrations\/[a-z0-9_/]+\.webp$/.test(path) || path.includes('..')) throw Error(`안전하지 않은 이미지 경로: ${path}`);
  const local = await readFile(`public/${path}`);
  const url = new URL(path, base); url.searchParams.set('v44', createHash('sha256').update(local).digest('hex').slice(0, 12));
  const response = await fetch(url, { cache: 'no-store' });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('image/webp')
    || bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP' || !bytes.equals(local)) throw Error(`WebP HTTP/형식/원본 바이트 불일치: ${path}`);
  checked.set(path, { path, status: response.status, type: response.headers.get('content-type'), bytes: bytes.length });
}
const report = { base: base.href, endingReferences: Object.keys(manifest.artByEndingId).length, uniqueFiles: checked.size,
  rows: Object.entries(manifest.artByEndingId).map(([endingId, path]) => ({ endingId, ...checked.get(path) })) };
if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify(report, null, 2) + '\n');
console.log(`${report.endingReferences}개 엔딩 매핑 / ${report.uniqueFiles}개 WebP HTTP200·Content-Type·원본 바이트 일치 (${base.href})`);
