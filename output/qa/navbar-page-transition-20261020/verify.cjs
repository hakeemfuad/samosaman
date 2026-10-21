const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('/Users/hakeem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const base = 'http://127.0.0.1:4190';
const mode = process.argv[2] || 'after';
const engine = process.argv[3] || 'chromium';

function traceNavbar() {
    window.navFrames = [];
    window.navTransitions = [];
    let started;
    document.addEventListener('transitionrun', event => {
        if (event.target.id === 'glass-nav') window.navTransitions.push(event.propertyName);
    });
    function frame(time) {
        const nav = document.getElementById('glass-nav');
        if (nav) {
            started ??= time;
            const rect = nav.getBoundingClientRect();
            window.navFrames.push({ time: time - started, width: rect.width, height: rect.height, x: rect.x, y: rect.y });
        }
        if (started === undefined || time - started < 900) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

(async () => {
    const browser = await (engine === 'webkit' ? webkit : chromium).launch(engine === 'chromium'
        ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true }
        : { headless: true });
    const results = [];
    try {
        const cases = [
            ...[390, 820, 1440].map(width => ({ width, label: 'compact to expanded' })),
            { width: 390, from: 'our-story.html', to: 'index.html', label: 'return to home' },
            { width: 1440, from: 'our-story.html', to: 'burlington.html', label: 'open menu page' },
            { width: 390, expanded: true, label: 'expanded to expanded' },
            { width: 1440, expanded: true, label: 'expanded to expanded' },
            { width: 390, reducedMotion: 'reduce', label: 'reduced motion' },
            { width: 1440, reducedMotion: 'reduce', label: 'reduced motion' },
            { width: 390, blockedStorage: true, label: 'storage unavailable' },
        ];
        for (const test of mode === 'back-before' ? cases.slice(0, 1) : cases) {
            const { width, label } = test;
            const from = test.from || 'index.html';
            const to = test.to || 'our-story.html';
            const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: test.reducedMotion || 'no-preference' });
            // Permit the site's styling dependencies; block analytics and auth.
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (mode === 'back-before' && url.pathname === '/js/navbar.js') return route.fulfill({ path: path.join(__dirname, 'navbar-before.js'), contentType: 'text/javascript' });
                return ['127.0.0.1', 'cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) ? route.continue() : route.abort();
            });
            await context.addInitScript(traceNavbar);
            if (test.blockedStorage) await context.addInitScript(() => {
                Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
            });
            const page = await context.newPage();
            await page.goto(`${base}/${from}`, { waitUntil: 'domcontentloaded' });
            await page.locator('#glass-nav').waitFor();
            if (!test.expanded) {
                await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' }));
                await page.waitForFunction(() => document.querySelector('#glass-nav.is-compact'));
            }
            await page.waitForTimeout(550);
            const before = await page.locator('#glass-nav').boundingBox();
            const link = to === 'index.html' ? '.nav-logo' : width < 981
                ? `#mobile-menu-overlay a[href="${to}"]` : `.nav-links a[href="${to}"]`;
            if (width < 981 && to !== 'index.html') await page.locator('#mobile-menu-btn').click();
            await page.locator(link).click();
            await page.waitForURL(`**/${to}`, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => window.navFrames?.at(-1)?.time >= 900);
            const result = await page.evaluate(() => ({ frames: navFrames, transitions: navTransitions, scrollY }));
            result.viewport = width;
            result.label = label;
            result.before = before;
            const expandedHeight = width < 641 ? 60 : 64;
            const expectAnimation = !test.expanded && !test.reducedMotion && !test.blockedStorage;
            result.pass = expectAnimation ? Math.abs(result.frames[0].height - before.height) < 0.5 &&
                result.frames.some(f => f.height > before.height + 0.5 && f.height < expandedHeight - 0.5) &&
                Math.abs(result.frames.at(-1).height - expandedHeight) < 0.5 &&
                result.transitions.includes('height') && result.scrollY === 0
                : result.frames.every(f => Math.abs(f.height - expandedHeight) < 0.5) && !result.transitions.includes('height');
            results.push(result);
            console.log(`${result.pass ? 'PASS' : 'FAIL'} ${engine} ${width}px ${label}: source ${before.height}px; first destination frame ${result.frames[0].height}px; transitions ${result.transitions.join(', ') || 'none'}`);
            if (label === 'compact to expanded' && width === 390) {
                await page.screenshot({ path: path.join(__dirname, `${engine}-expanded.png`) });
                await page.goBack({ waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(650);
                const back = await page.evaluate(() => ({ scrollY, compact: document.querySelector('#glass-nav').classList.contains('is-compact') }));
                // The existing non-cached Back path starts expanded at the saved offset.
                // Check the saved scroll and the actual scroll-driven collapse/expand path.
                await page.evaluate(() => scrollTo({ top: 650, behavior: 'instant' }));
                await page.waitForFunction(() => document.querySelector('#glass-nav.is-compact'));
                await page.evaluate(() => scrollTo({ top: 550, behavior: 'instant' }));
                await page.waitForFunction(() => !document.querySelector('#glass-nav.is-compact'));
                results.push({ label: 'Back keeps saved scroll and scroll direction behavior', viewport: width, ...back, pass: back.scrollY === 600 });
                console.log(`${back.scrollY === 600 ? 'PASS' : 'FAIL'} ${engine} Back and scroll direction: ${JSON.stringify(back)}`);
                await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
                await page.waitForTimeout(550);
                await page.reload({ waitUntil: 'domcontentloaded' });
                await page.waitForFunction(() => window.navFrames?.at(-1)?.time >= 900);
                const reload = await page.evaluate(() => ({ frames: navFrames, transitions: navTransitions }));
                reload.pass = reload.frames.every(f => Math.abs(f.height - 60) < 0.5) && !reload.transitions.includes('height');
                results.push({ label: 'Reload starts expanded without replay', viewport: width, ...reload });
                console.log(`${reload.pass ? 'PASS' : 'FAIL'} ${engine} reload`);
            }
            await context.close();
        }
    } finally {
        await browser.close();
        fs.writeFileSync(path.join(__dirname, `${mode}-${engine}.json`), JSON.stringify(results, null, 2) + '\n');
    }
    assert.ok(results.length === 12 && results.every(r => r.pass), 'Navbar navigation checks must all pass.');
})().catch(error => { console.error(error); process.exitCode = 1; });
