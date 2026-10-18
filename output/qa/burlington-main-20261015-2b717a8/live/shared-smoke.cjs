const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[],errors=[];
 try {
  const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [375,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto('https://samosamanvt.com/',{waitUntil:'networkidle'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.match(await page.locator('#nav-user-btn').getAttribute('aria-label'),/^(Open account|My account|Sign in)$/);
   await page.locator('#open-cart-btn').click();
   await page.waitForFunction(()=>!document.getElementById('cart-sidebar').classList.contains('translate-x-full'));
   await page.locator('#close-cart-btn').click();
   await page.waitForFunction(()=>document.getElementById('cart-sidebar').classList.contains('translate-x-full'));
   await page.waitForTimeout(350);
   if(width===375){
    await page.locator('#mobile-menu-btn').click();
    await page.waitForFunction(()=>!document.getElementById('mobile-menu-overlay').classList.contains('translate-x-full'));
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
    await page.locator('#mobile-menu-btn').click();
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
   }
   for(const name of ['Instagram','Twitter','Facebook'])assert.equal(await page.locator(`#footer-placeholder a[aria-label="${name}"]`).count(),1);
   results.push({width,cart:true,navigation:width===375?'passed':'desktop links',socialNames:true,noOverflow:true});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(__dirname+'/shared-smoke.json',JSON.stringify({url:'https://samosamanvt.com/',results,errors},null,2)+'\n');
  console.log(JSON.stringify({sharedHomepageChecksPassed:results.length,errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
