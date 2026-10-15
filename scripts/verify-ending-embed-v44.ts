import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';

const target = new URL(process.argv[2] ?? 'http://127.0.0.1:4177/demon-king-life/');
const escaped = target.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
// 실제 HTTP 응답을 써서 브라우저의 로컬 네트워크 보안 검사를 그대로 유지한다.
const parent = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>블로그 임베드 검수</title><body style="margin:0"><iframe id="game" title="게임" src="${escaped}" style="display:block;width:100%;height:100vh;border:0"></iframe></body></html>`);
});
await new Promise<void>((resolve, reject) => { parent.once('error', reject); parent.listen(4199, '127.0.0.1', resolve); });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const [name, width, height] of [['PC', 1280, 900], ['mobile', 390, 844]] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    const responses = new Map<string, number>(); page.on('response', response => responses.set(response.url(), response.status()));
    await page.goto('http://127.0.0.1:4199/blog');
    await expect(page.frameLocator('#game').locator('.title-card')).toBeVisible();
    const frame = page.frames().find(frame => frame.url().startsWith(target.href))!;
    // 별도 출처 iframe의 도감 표시용 과거 획득 기록. 게임 분기 해금 검증과 구분한다.
    await frame.evaluate(() => {
      localStorage.setItem('existence-sim:v1:meta:demon-king:compact', JSON.stringify({ saveSchemaVersion: 1, discoveredEndings: { 'demon-king': ['ending_peace'] } }));
      localStorage.setItem('demon-king:ui:text-percent', '150');
    });
    await frame.goto(target.href);
    const open = frame.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }); await expect(open).toBeEnabled(); await open.click();
    await frame.locator('[data-ending-detail="ending_peace"]').click();
    const image = frame.locator('.ending-detail .ending-art img');
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const result = await image.evaluate((img: HTMLImageElement) => ({ source: img.currentSrc, naturalWidth: img.naturalWidth, width: img.getBoundingClientRect().width, fit: getComputedStyle(img).objectFit }));
    expect(new URL(result.source).origin).toBe(target.origin);
    expect(new URL(result.source).pathname.startsWith(`${target.pathname}assets/`)).toBe(true);
    expect(result.width).toBeLessThanOrEqual(result.naturalWidth + 1); expect(result.fit).toBe('contain'); expect(responses.get(result.source)).toBe(200);
    await expect(frame.locator('.ending-detail svg')).toHaveCount(0);
    await page.screenshot({ path: `${process.env.EVIDENCE_DIR || 'docs/v4.4'}/embed-${name}.png`, animations: 'disabled' });
    console.log(`${name} ${width}×${height}: 다른 출처의 블로그형 iframe → 게임 자체 배포 경로에서 WebP HTTP200/원본 크기/contain 확인 (${result.source})`);
    await page.close();
  }
} finally { await browser.close(); await new Promise<void>((resolve, reject) => parent.close(error => error ? reject(error) : resolve())); }
