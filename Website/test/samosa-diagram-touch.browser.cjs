// Run: npx playwright install chromium webkit && npm run test:diagram
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');
const { chromium, webkit } = require('playwright');

const publicRoot = path.resolve(__dirname, '../public');
const mimeTypes = {
    '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
};

test('a mobile close tap cannot activate a returning hotspot', async (t) => {
    const server = http.createServer(async (request, response) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        const file = path.resolve(publicRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (!file.startsWith(`${publicRoot}${path.sep}`)) {
            response.writeHead(403).end();
            return;
        }
        try {
            const contents = await fs.readFile(file);
            response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
            response.end(contents);
        } catch {
            response.writeHead(404).end();
        }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/`;

    for (const [name, engine] of Object.entries({ chromium, webkit })) {
        await t.test(name, async (t) => {
            const browser = await engine.launch({ headless: true });
            t.after(() => browser.close());
            const page = await browser.newPage({
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
                reducedMotion: 'reduce',
            });
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            const diagram = page.locator('[data-samosa-diagram]');
            await page.locator('[data-samosa-diagram]:not([hidden])').waitFor();
            await diagram.scrollIntoViewIfNeeded();

            for (const initial of ['fold', 'filling', 'salsa']) {
                for (const closeAt of ['fold', 'filling', 'salsa']) {
                    await t.test(`${initial}: close at hidden ${closeAt}`, async () => {
                        await page.locator('[data-diagram-whole]').tap();
                        await page.locator(`[data-diagram-part="${initial}"]`).tap();
                        const point = await page.locator(`[data-diagram-part="${closeAt}"]`).evaluate((element) => {
                            const box = element.getBoundingClientRect();
                            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
                        });
                        // Use browser touch input: a DOM click does not reproduce click retargeting.
                        await page.touchscreen.tap(point.x, point.y);
                        await page.waitForTimeout(80);
                        assert.equal(await diagram.getAttribute('data-detail-open'), 'false');
                        assert.equal(await diagram.locator('[data-diagram-part][aria-pressed="true"]').count(), 0);
                        assert.equal(await page.locator('[data-diagram-whole]').getAttribute('aria-pressed'), 'true');

                        // The close action must not consume the next deliberate hotspot tap.
                        await page.locator('[data-diagram-part="filling"]').tap();
                        assert.equal(await page.locator('[data-diagram-part="filling"]').getAttribute('aria-pressed'), 'true');
                    });
                }
            }
        });
    }
});
