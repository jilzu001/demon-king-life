import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4181/demon-king-life/');
const installed = JSON.parse(await readFile('docs/v4.6/art-installed.json', 'utf8'));
const paths = (await readdir('public', { recursive: true })).filter(path => path.endsWith('.webp')).map(path => path.replaceAll('\\', '/')).sort();
const rows = [];
for (let start = 0; start < paths.length; start += 8) {
  rows.push(...await Promise.all(paths.slice(start, start + 8).map(async path => {
    const response = await fetch(new URL(path, base), { cache: 'no-store' });
    const bytes = Buffer.from(await response.arrayBuffer()), local = await readFile(`public/${path}`);
    if (response.status !== 200 || !response.headers.get('content-type')?.includes('image/webp') || !bytes.equals(local)
      || bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP') throw new Error(`WebP HTTP/형식/바이트 불일치: ${path}`);
    return { path, status: response.status, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  })));
}
for (const row of installed) {
  const checked = rows.find(item => item.path === row.path);
  if (checked?.sha256 !== row.sha256 || checked.bytes !== row.bytes) throw new Error(`검수 원장과 HTTP 이미지 불일치: ${row.id}`);
}
for (const path of ['assets/ending_art_manifest_v4_4.json', 'assets/scene_art_manifest_v4_5.json']) {
  const response = await fetch(new URL(path, base), { cache: 'no-store' });
  if (response.status !== 200 || !Buffer.from(await response.arrayBuffer()).equals(await readFile(`public/${path}`))) throw new Error(`공개 이미지 매핑 불일치: ${path}`);
}
const report = { base: base.href, checkedAt: new Date().toISOString(), installedCount: installed.length, installedBytes: installed.reduce((sum, row) => sum + row.bytes, 0), checkedFiles: rows.length, rows };
if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify(report, null, 2) + '\n');
console.log(`전체 WebP${rows.length}개 HTTP200·형식·원본 바이트 일치 / 검수 설치${installed.length}개·${report.installedBytes}바이트`);
