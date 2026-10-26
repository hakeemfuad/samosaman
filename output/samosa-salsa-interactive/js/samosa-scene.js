(() => {
    const scene = document.querySelector('[data-samosa-scene]');
    if (!scene) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let offsetX = 0;
    let offsetY = 0;

    const resetPointer = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        offsetX = 0;
        offsetY = 0;
        scene.style.removeProperty('--scene-x');
        scene.style.removeProperty('--scene-y');
    };

    scene.addEventListener('pointermove', (event) => {
        if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
        const bounds = scene.getBoundingClientRect();
        offsetX = ((event.clientX - bounds.left) / bounds.width - .5) * 14;
        offsetY = ((event.clientY - bounds.top) / bounds.height - .5) * 10;
        if (frame) return;
        frame = requestAnimationFrame(() => {
            scene.style.setProperty('--scene-x', `${offsetX.toFixed(2)}px`);
            scene.style.setProperty('--scene-y', `${offsetY.toFixed(2)}px`);
            frame = 0;
        });
    });

    scene.addEventListener('pointerleave', resetPointer);
    scene.addEventListener('pointercancel', resetPointer);
    scene.addEventListener('blur', resetPointer);
    reducedMotion.addEventListener('change', resetPointer);
    finePointer.addEventListener('change', resetPointer);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) resetPointer();
    });

    // A native button gives touch, Enter, and Space the same reversible pose.
    // Reduced motion changes the pose instantly instead of animating it.
    scene.addEventListener('click', () => {
        scene.setAttribute('aria-pressed', String(scene.getAttribute('aria-pressed') !== 'true'));
    });

    scene.disabled = false;
    const hint = document.getElementById('samosa-scene-hint');
    if (hint) hint.hidden = false;
})();
