const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
try {
const page=await browser.newPage();
for(const width of [375,900])for(const reducedMotion of ['no-preference','reduce']){
 await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion});
 await page.goto('http://127.0.0.1:4183/burlington.html',{waitUntil:'networkidle'});
 for(const type of ['navigation','cart']){
 const result=await page.evaluate(async({type,reducedMotion})=>{
 const drawer=document.getElementById(type==='navigation'?'mobile-menu-overlay':'cart-sidebar');
 const open=()=>document.getElementById(type==='navigation'?'mobile-menu-btn':'open-cart-btn').click();
 const close=()=>document.getElementById(type==='navigation'?'mobile-menu-btn':'close-cart-btn').click();
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const sample=()=>({x:drawer.getBoundingClientRect().x,visibility:getComputedStyle(drawer).visibility});
 open();await delay(360);const opened=sample();close();await delay(120);const closing=sample();await delay(240);const closed=sample();
 open();await delay(360);close();await delay(80);open();await delay(360);const reopened=sample();close();await delay(360);
 return {opened,closing,closed,reopened};
 },{type,reducedMotion});
 assert.equal(result.closed.visibility,'hidden');assert.equal(result.reopened.visibility,'visible');if(type==='navigation')assert.equal(result.reopened.x,result.opened.x);
 if(reducedMotion==='reduce')assert.equal(result.closing.visibility,'hidden');
 else {assert.equal(result.closing.visibility,'visible');assert(result.closing.x>result.opened.x&&result.closing.x<result.closed.x);}
 console.log(JSON.stringify({width,reducedMotion,type,pass:true}));
 }
}
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
