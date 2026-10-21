const {webkit,chromium}=require('playwright');
(async()=>{
 const b=await webkit.launch({headless:true});
 try {
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();
 await p.goto('http://127.0.0.1:4195/punjabi.html');
 await p.evaluate(()=>{window.events=[];for(const t of ['touchstart','touchend','click'])document.addEventListener(t,e=>window.events.push({type:t,target:e.target.tagName,cls:e.target.className,at:performance.now()}),{capture:true});});
 await p.locator('[data-diagram-toggle]').tap();await p.waitForTimeout(1200);
 await p.locator('[data-condiment-option]').tap();await p.waitForTimeout(1200);
 await p.locator('[data-diagram-caption]').tap();
 console.log('immediate',await p.locator('[data-samosa-diagram]').getAttribute('data-detail-open'));
 await p.waitForTimeout(700);
 console.log('after 700ms',await p.locator('[data-samosa-diagram]').getAttribute('data-detail-open'));
 console.log(await p.evaluate(()=>window.events));
 }finally{await b.close();}
 const chrome=await chromium.launch({channel:'chrome',headless:true});
 try {const p=await chrome.newPage({viewport:{width:1440,height:1000}});await p.goto('http://127.0.0.1:4195/');await p.waitForTimeout(500);await p.screenshot({path:__dirname+'/qa/gallery-1440.png',fullPage:true});console.log(await p.locator('h1').count());}finally{await chrome.close();}
})().catch(e=>{console.error(e);process.exit(1);});
