const {chromium, webkit} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = __dirname;
const OUT = path.join(ROOT, 'qa');
const base = 'http://127.0.0.1:4195/';
const flavors = JSON.parse(fs.readFileSync(path.join(ROOT, 'flavors.json')));
const sizes = [[320,760],[390,844],[820,1180],[1024,768],[1280,720],[1440,900]];
const results = [], errors = [];
const quick = process.argv.includes('--quick');
const touchOnly = process.argv.includes('--touch-only');
const activeBrowsers = [];
const settle = page => page.waitForTimeout(1150);
async function state(page) {
  return page.evaluate(() => {
    const d = document.querySelector('[data-samosa-diagram]');
    const stage = d.querySelector('.samosa-diagram__stage').getBoundingClientRect();
    const caption = d.querySelector('[data-diagram-caption]').getBoundingClientRect();
    const options = d.querySelector('.samosa-diagram__options, [data-diagram-controls]').getBoundingClientRect();
    const box = node => {const r = node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {
      open:d.dataset.detailOpen, closeup:d.dataset.closeup, spread:d.style.getPropertyValue('--spread'),
      chutney:d.dataset.chutney, caption:d.querySelector('[data-diagram-caption] p').textContent,
      height:document.querySelector('.home-hero').getBoundingClientRect().height,
      overflow:document.documentElement.scrollWidth > innerWidth,
      inert:d.querySelector('[data-diagram-hotspots]').inert,
      ariaHidden:d.querySelector('[data-diagram-hotspots]').getAttribute('aria-hidden'),
      visiblePoints:[...d.querySelectorAll('[data-diagram-part]')].filter(n=>!n.hidden).map(n=>n.dataset.diagramPart),
      stage:box(d.querySelector('.samosa-diagram__stage')),
      options:box(d.querySelector('.samosa-diagram__options, [data-diagram-controls]')),
      captionBox:box(d.querySelector('[data-diagram-caption]')),
      stageOptionsOverlap:Math.min(stage.right,options.right)-Math.max(stage.left,options.left)>1 && Math.min(stage.bottom,options.bottom)-Math.max(stage.top,options.top)>1,
      stageCaptionOverlap:Math.min(stage.right,caption.right)-Math.max(stage.left,caption.left)>1 && Math.min(stage.bottom,caption.bottom)-Math.max(stage.top,caption.top)>1,
      cameraTransition:getComputedStyle(d.querySelector('.samosa-diagram__camera')).transitionDuration,
      bowlOpacity:d.querySelector('[data-art-part="salsa"]') ? getComputedStyle(d.querySelector('[data-art-part="salsa"]')).opacity : null,
      imageURLs:[...document.querySelectorAll('image,img')].map(n=>n.getAttribute('href') || n.getAttribute('src')),
      duplicateIds:[...document.querySelectorAll('[id]')].map(n=>n.id).filter((id,i,all)=>all.indexOf(id)!==i),
      focused:document.activeElement?.getAttribute('data-diagram-part') || document.activeElement?.hasAttribute('data-diagram-toggle') && 'toggle' || document.activeElement?.tagName,
    };
  });
}
function fit(s) {
  assert(!s.overflow, 'Horizontal overflow');
  assert(!s.stageOptionsOverlap, 'Controls overlap the image');
  assert(!s.stageCaptionOverlap, 'Caption overlaps the image');
  assert(s.stage.width > 0 && s.stage.height > 0, 'Empty stage');
  assert(!s.duplicateIds.length, 'Duplicate IDs');
  assert(s.imageURLs.every(url=>url.startsWith('data:')), 'External image dependency');
}
async function shot(page,name) {await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});}
async function run() {
  if (!touchOnly) {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  activeBrowsers.push(browser);
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  if (quick) {
    for(const size of [[1440,900],[390,844]]) {
      await page.setViewportSize({width:size[0],height:size[1]});
      await page.goto(base+'chicken-cheese.html');await settle(page);
      await shot(page,'first-'+size[0]+'-whole');
      await page.locator('[data-diagram-toggle]').click();await settle(page);
      await shot(page,'first-'+size[0]+'-filling');
      await page.locator('[data-chutney-toggle]').check();await settle(page);
      await shot(page,'first-'+size[0]+'-chutney');
      const s=await state(page);fit(s);console.log(JSON.stringify(s, (k,v)=>k==='imageURLs'?v.length:v));
    }
    await browser.close();return;
  }

  // Fresh component baseline; no production files are changed.
  for(const [width,height] of sizes) {
    await page.setViewportSize({width,height});await page.goto(base+'baseline.html');
    for(const part of ['whole','fold','filling','salsa']) {
      if(part!=='whole') await page.locator(`[data-diagram-part="${part}"]`).click();
      await settle(page);const s=await state(page);fit(s);
      results.push({flavor:'baseline',viewport:[width,height],part,...s,imageURLs:undefined});
      if([390,1440].includes(width))await shot(page,`baseline-${width}-${part}`);
      if(part!=='whole')await page.locator('[data-diagram-whole]').click();
    }
  }

  for(const flavor of flavors) {
    for(const [width,height] of sizes) {
      await page.setViewportSize({width,height});await page.goto(base+flavor.slug+'.html');await settle(page);
      let s=await state(page);fit(s);assert.equal(s.open,'false');assert.deepEqual(s.visiblePoints,['fold','filling']);
      assert.equal(s.bowlOpacity,flavor.chutney?'0':null);
      results.push({flavor:flavor.slug,viewport:[width,height],part:'whole',...s,imageURLs:undefined});
      if([390,1440].includes(width))await shot(page,`${flavor.slug}-${width}-whole`);
      for(const part of ['fold','filling']) {
        await page.locator(`[data-diagram-part="${part}"]`).click();await settle(page);
        s=await state(page);fit(s);assert.equal(s.open,'true');assert(s.inert);assert.equal(s.ariaHidden,'true');
        if(part==='filling')assert.equal(s.caption,flavor.caption);
        if(width>=1024)assert.equal(s.height,Math.max(540,height-132));
        results.push({flavor:flavor.slug,viewport:[width,height],part,...s,imageURLs:undefined});
        if([390,1440].includes(width))await shot(page,`${flavor.slug}-${width}-${part}`);
        await page.locator('[data-diagram-caption]').click();assert.equal((await state(page)).open,'false');
      }
      if(flavor.chutney) {
        await page.locator('[data-diagram-toggle]').click();
        await page.locator('[data-chutney-toggle]').check();await settle(page);
        s=await state(page);fit(s);assert.equal(s.open,'true');assert.equal(s.spread,'1');assert.equal(s.bowlOpacity,'1');
        if([390,1440].includes(width))await shot(page,`${flavor.slug}-${width}-filling-chutney`);
        await page.locator('[data-diagram-whole]').click();
        await page.locator('[data-diagram-part="salsa"]').click();await settle(page);
        s=await state(page);fit(s);assert.equal(s.closeup,'salsa');
        results.push({flavor:flavor.slug,viewport:[width,height],part:'chutney',...s,imageURLs:undefined});
        if([390,1440].includes(width))await shot(page,`${flavor.slug}-${width}-chutney-closeup`);
        await page.locator('[data-chutney-toggle]').uncheck();await settle(page);
        s=await state(page);assert.equal(s.open,'false');assert.equal(s.bowlOpacity,'0');assert.deepEqual(s.visiblePoints,['fold','filling']);
      } else assert.equal(await page.locator('[data-chutney-toggle]').count(),0);
    }
    console.log('PASS layouts and states:',flavor.slug);
  }

  // Keyboard and rapid input, including hidden optional controls and focus return.
  for(const flavor of flavors) {
    await page.setViewportSize({width:390,height:844});await page.goto(base+flavor.slug+'.html');
    const fold=page.locator('[data-diagram-part="fold"]'), toggle=page.locator('[data-diagram-toggle]');
    await fold.focus();await page.keyboard.press('ArrowLeft');assert.equal((await state(page)).spread,'1');
    await page.keyboard.press('Escape');assert.equal((await state(page)).focused,'filling');
    await page.keyboard.press('Enter');assert.equal((await state(page)).spread,'1');
    await page.keyboard.press('Escape');await fold.focus();await page.keyboard.press('Space');assert.equal((await state(page)).closeup,'fold');
    await page.keyboard.press('Escape');assert.equal((await state(page)).focused,'fold');
    await toggle.click();await page.locator('.samosa-diagram__stage').click({position:{x:10,y:10}});assert.equal((await state(page)).open,'false');
    if(flavor.chutney) {
      const check=page.locator('[data-chutney-toggle]');await check.focus();await page.keyboard.press('Space');assert(await check.isChecked());
      await fold.focus();await page.keyboard.press('ArrowLeft');assert.equal((await state(page)).closeup,'salsa');
      await page.keyboard.press('Escape');assert.equal((await state(page)).focused,'salsa');
      await check.uncheck();await toggle.click();await toggle.click();assert.equal((await state(page)).open,'false');
    }
    await page.emulateMedia({reducedMotion:'reduce'});await toggle.click();assert.equal((await state(page)).cameraTransition,'0s');
    await page.emulateMedia({reducedMotion:'no-preference'});
    console.log('PASS keyboard, rapid input, reduced motion:',flavor.slug);
  }

  // Each copied file runs by itself from file://. No HTTP image, CSS, or script dependency.
  for(const flavor of flavors) {
    await page.goto('file://'+path.join(ROOT,flavor.slug+'.html'));
    await page.locator('[data-diagram-toggle]').click();assert.equal((await state(page)).caption,flavor.caption);
    const offline = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const p=await offline.newPage();await p.goto('file://'+path.join(ROOT,flavor.slug+'.html'));
    const fallback=await p.locator('[data-diagram-fallback]').evaluate(n=>({visible:n.getBoundingClientRect().height>0,loaded:n.complete&&n.naturalWidth>0,alt:n.alt}));
    assert(fallback.visible&&fallback.loaded);assert(fallback.alt.includes('without a condiment'));
    await p.screenshot({path:path.join(OUT,flavor.slug+'-no-js.png'),fullPage:true});await offline.close();
  }
  await page.goto(base);assert.equal(await page.locator('.flavor-card').count(),4);await shot(page,'gallery-390');
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(500);await shot(page,'gallery-1440');
  assert.deepEqual(errors,[]);
  await browser.close();
  } else {
    const prior=JSON.parse(fs.readFileSync(path.join(OUT,'failure.json')));
    results.push(...prior.results);
    assert.deepEqual(prior.errors,[]);
  }

  // WebKit simulated touch: this is not a physical iPhone check.
  const safari=await webkit.launch({headless:true});
  activeBrowsers.push(safari);
  const touch=await safari.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  const p=await touch.newPage();p.on('pageerror',e=>errors.push(e.message));
  for(const flavor of flavors) {
    await p.goto(base+flavor.slug+'.html');await p.locator('[data-diagram-toggle]').tap();await settle(p);
    assert.equal((await state(p)).caption,flavor.caption);
    if(flavor.chutney){await p.locator('[data-condiment-option]').tap();await settle(p);assert.equal((await state(p)).bowlOpacity,'1');}
    await shot(p,flavor.slug+'-webkit-touch');await p.locator('[data-diagram-caption]').tap();
    await p.waitForFunction(()=>document.querySelector('[data-samosa-diagram]').dataset.detailOpen==='false');
    // A moving or cancelled pointer is a scroll, not a tap-to-close request.
    await p.locator('[data-diagram-toggle]').tap();
    await p.evaluate(()=>{
      const target=document.querySelector('[data-diagram-caption]');
      const init={bubbles:true,pointerType:'touch',isPrimary:true,pointerId:99,clientX:100,clientY:100};
      target.dispatchEvent(new PointerEvent('pointerdown',init));
      target.dispatchEvent(new PointerEvent('pointerup',{...init,clientY:160}));
    });
    assert.equal((await state(p)).open,'true');
    await p.locator('.samosa-diagram__stage').tap({position:{x:10,y:10}});
    await p.waitForFunction(()=>document.querySelector('[data-samosa-diagram]').dataset.detailOpen==='false');
    if(flavor.chutney){await p.locator('[data-condiment-option]').tap();assert.equal(await p.locator('[data-chutney-toggle]').isChecked(),false);}
    console.log('PASS WebKit touch:',flavor.slug);
  }
  await safari.close();assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(OUT,'verification.json'),JSON.stringify({passed:true,checkedAt:new Date().toISOString(),browsers:['Chrome','WebKit'],physicalDeviceTest:false,standaloneFileAndNoJsPass:true,keyboardAndReducedMotionPass:true,errors,results},null,2)+'\n');
  console.log('PASS all checks; evidence saved in',OUT);
}
run().catch(async error=>{fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({error:error.stack,errors,results},null,2));console.error(error);await Promise.allSettled(activeBrowsers.map(b=>b.close()));process.exitCode=1;});
