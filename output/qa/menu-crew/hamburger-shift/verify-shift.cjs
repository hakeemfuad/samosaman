const {chromium}=require('playwright');
const fs=require('node:fs');
const out='/Users/hakeem/Samosaman/output/qa/menu-crew/hamburger-shift';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
 const page=await browser.newPage();
 const rows=[];
 const widths=(process.env.MENU_SHIFT_WIDTHS||'375,430,768,900,1023').split(',').map(Number);
 for(const width of widths){
  await page.setViewportSize({width,height:844});
  await page.goto('http://127.0.0.1:4183/burlington.html',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const sample=()=>page.evaluate(()=>{
   const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height});
   const nodes=['.menu-counter','.menu-counter h1','.menu-address','#hours-status-text'];
   return {innerWidth,clientWidth:document.documentElement.clientWidth,bodyWidth:document.body.clientWidth,scrollY,measurements:nodes.map(selector=>{const node=document.querySelector(selector),range=document.createRange();range.selectNodeContents(node);return {selector,box:rect(node.getBoundingClientRect()),text:[...range.getClientRects()].map(rect)};})};
  });
  const before=await sample();
  await page.screenshot({path:`${out}/before-${width}.png`});
  await page.locator('#mobile-menu-btn').click();
  const open=await sample();
  await page.waitForTimeout(350);
  await page.locator('#mobile-menu-btn').click();
  await page.waitForTimeout(350);
  const closed=await sample();
  const differences=[];
  for(const phase of [{name:'open',value:open},{name:'closed',value:closed}])for(let i=0;i<before.measurements.length;i++){
   const a=before.measurements[i],b=phase.value.measurements[i];
   for(const k of ['x','y','width','height'])if(Math.abs(a.box[k]-b.box[k])>.1)differences.push(`${phase.name}: ${a.selector} ${k} ${a.box[k]} → ${b.box[k]}`);
   if(JSON.stringify(a.text)!==JSON.stringify(b.text))differences.push(`${phase.name}: ${a.selector} text moved/reflowed`);
  }
  rows.push({width,pass:differences.length===0,before,open,closed,differences});
  console.log(JSON.stringify({width,pass:differences.length===0,gutterBefore:before.innerWidth-before.clientWidth,gutterOpen:open.innerWidth-open.clientWidth,differences}));
 }
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));
 await browser.close();if(rows.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
