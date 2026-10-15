import { readFile, writeFile } from 'node:fs/promises';
const base = process.argv[2];
if (!base) throw new Error('검증할 게임 URL이 필요합니다.');
const manifestPath = 'assets/scene_art_manifest_v4_5.json';
const original = await readFile(`public/${manifestPath}`);
const response = await fetch(new URL(manifestPath, base), { cache: 'no-store' });
if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(original)) throw new Error('CG 연결 지침 HTTP/원본 불일치');
const manifest = JSON.parse(original.toString('utf8'));
const rows = [];
for (const rule of manifest.rules) {
  const source = await readFile(`public/${rule.artPath}`);
  const response = await fetch(new URL(rule.artPath, base), { cache: 'no-store' });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('image/webp') || !bytes.equals(source)
    || bytes.length !== rule.bytes || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${rule.artPath}: HTTP/MIME/원본 불일치`);
  rows.push({ id: rule.id, path: rule.artPath, status: response.status, type: response.headers.get('content-type'), bytes: bytes.length, width: rule.width, height: rule.height });
}
if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify({ base, rows }, null, 2) + '\n');
console.log(`신규3개 CG/연결 지침 HTTP200·WebP·원본 바이트 동일, 총${rows.reduce((sum, row) => sum + row.bytes, 0)}바이트 (${base})`);
