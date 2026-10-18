const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out='/Users/hakeem/Samosaman/output/qa/menu-crew/hamburger-shift';
(async()=>{
 const reports=[];
 for(const mode of ['classic','overlay']){
  const browser=await chromium.launch({channel:'chrome',headless:true,...(mode==='classic'?{ignoreDefaultArgs:['--hide-scrollbars']}: {})});
  try{
   const page=await browser.newPage();
   for(const target of [{path:'burlington.html',width:375},{path:'burlington.html',width:900},{path:'index.html',width:375}]){
    await page.setViewportSize({width:target.width,height:844});
    await page.goto(`http://127.0.0.1:4183/${target.path}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    if(target.path==='burlington.html'&&target.width===900)await page.evaluate(()=>{document.body.style.paddingRight='13px';document.getElementById('mobile-menu-btn').closest('nav').style.paddingRight='7px';});
    const measure=()=>page.evaluate(()=>{
     const selectors=['#mobile-menu-btn',document.querySelector('.menu-counter')?'.menu-counter':'main'];
     return {gutter:innerWidth-document.documentElement.clientWidth,bodyPadding:document.body.style.paddingRight,navPadding:document.getElementById('mobile-menu-btn').closest('nav').style.paddingRight,scrollY,boxes:selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {s,x:r.x,y:r.y,width:r.width,height:r.height};})};
    });
    const before=await measure();
    for(let cycle=0;cycle<3;cycle++){
     await page.locator('#mobile-menu-btn').click();await page.waitForTimeout(340);
     const open=await measure();assert.deepEqual(open.boxes,before.boxes,`${mode} ${target.path} ${target.width}: open layout moved`);
     await page.mouse.wheel(0,160);await page.waitForTimeout(80);assert.equal((await measure()).scrollY,before.scrollY,'Background scroll lock failed');
     await page.locator('#mobile-menu-btn').click();await page.waitForTimeout(340);
     const closed=await measure();assert.deepEqual(closed.boxes,before.boxes,'Close layout moved');assert.equal(closed.bodyPadding,before.bodyPadding);assert.equal(closed.navPadding,before.navPadding);
    }
    await page.mouse.wheel(0,160);await page.waitForTimeout(150);assert((await measure()).scrollY>before.scrollY,'Scrolling did not resume');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal overflow');
    const result={mode,...target,gutter:before.gutter,cycles:3,unchangedLayout:true,existingPaddingRestored:true,scrollLock:true,scrollResumes:true};reports.push(result);console.log(JSON.stringify(result));
   }
  }finally{await browser.close();}
 }
 fs.writeFileSync(`${out}/scroll-lock-results.json`,JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
