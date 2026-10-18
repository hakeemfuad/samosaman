const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
try {
const page=await browser.newPage({viewport:{width:390,height:844}});
let failed=false;
for(const path of ['menu.html','burlington.html']){
 await page.goto('http://127.0.0.1:4183/'+path,{waitUntil:'networkidle'});
 await page.locator('#mobile-menu-btn').click();await page.waitForTimeout(400);
 const result=await page.evaluate(async()=>{
 const drawer=document.getElementById('mobile-menu-overlay');
 const measure=()=>({x:drawer.getBoundingClientRect().x,visibility:getComputedStyle(drawer).visibility});
 const open=measure();document.getElementById('mobile-menu-btn').click();
 await new Promise(r=>setTimeout(r,120)); const during=measure();
 await new Promise(r=>setTimeout(r,250)); const closed=measure();
 return {open,during,closed,width:innerWidth};
 });
 const pass=result.during.visibility==='visible'&&result.during.x>result.open.x&&result.during.x<result.closed.x;
 console.log(JSON.stringify({path,pass,...result}));if(!pass)failed=true;
}
process.exitCode=failed?1:0;
}finally{await browser.close();}
})();
