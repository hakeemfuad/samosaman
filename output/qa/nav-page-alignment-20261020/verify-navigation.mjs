// Run with a Codex in-app browser tab at the local SamosaMan preview.
// Checks actual page navigation at the same viewport and top scroll position.
export async function verifyNavigation(tab) {
    const positions = [];
    for (const label of ['SamosaMan home', 'Menu', 'Delivery', 'Rewards', 'Catering', 'Our Story']) {
        await tab.playwright.locator('#glass-nav').getByRole('link', { name: label, exact: true }).click();
        await tab.getAXState({ emit: false });
        positions.push(await tab.playwright.getByRole('button', { name: 'Open shopping bag', exact: true }).evaluate(button => {
            const box = element => {
                const r = element.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
            };
            return {
                page: location.pathname, viewport: innerWidth,
                clientWidth: document.documentElement.clientWidth, scrollY,
                bag: box(button), icon: box(button.querySelector('svg')),
                nav: box(button.closest('nav')),
                stroke: button.querySelector('svg').getAttribute('stroke-width')
            };
        }));
    }
    const baseline = positions[0];
    const pass = positions.every(p => p.viewport === baseline.viewport && p.scrollY === 0 &&
        Math.abs(p.icon.x - baseline.icon.x) < 0.1 && Math.abs(p.icon.y - baseline.icon.y) < 0.1 &&
        p.icon.width === 20 && p.icon.height === 20 && p.stroke === '1.2');
    return { pass, maxHorizontalShift: Math.max(...positions.map(p => p.icon.x)) - Math.min(...positions.map(p => p.icon.x)), positions };
}
