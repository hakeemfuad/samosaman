const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const out = '/Users/hakeem/Samosaman/output/qa/burlington-main-20261015-2b717a8/live';
const original = JSON.parse(fs.readFileSync(`${out}/original-items.json`));
const results = [], errors = [];
async function check(name, fn) { try { const evidence = await fn(); results.push({name,pass:true,evidence}); console.log('PASS',name); } catch (e) {results.push({name,pass:false,error:e.stack});console.log('FAIL',name,e.message);} }
(async()=>{
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const context = await browser.newContext({viewport:{width:375,height:844},timezoneId:'Asia/Tokyo'});
 const page = await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://samosamanvt.com/burlington.html',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await check('Static menu preserves all 9 items and exact descriptions',async()=>{
  const cards=await page.locator('.menu-card').evaluateAll(nodes=>nodes.map(card=>{const b=card.querySelector('button');return {id:b.dataset.id,name:b.dataset.name,price:b.dataset.price,image:card.querySelector('img').getAttribute('src'),description:card.querySelector('p').textContent,group:card.classList.contains('group')};}));
  assert.equal(cards.length,14);
  assert.equal(new Set(cards.map(c=>c.id)).size,9);
  cards.forEach(c=>{const o=original[c.id];['name','price','image','description'].forEach(k=>assert.equal(c[k],o[k],`${c.id} ${k}`));assert(c.group);});
  assert.deepEqual(cards.slice(0,5).map(c=>c.id),['chicken-curry-meal','punjabi-samosa','steak-cheese','spicy-chicken','chicken-cheese']);
  return {uniqueItems:9,buttons:14};
 });
 await check('Every Add button stores the right item, name, price and thumbnail',async()=>{
  await page.evaluate(()=>saveCart([]));
  const quantities={};
  for(let i=0;i<14;i++){
   const button=page.locator('.add-to-bag-btn').nth(i),id=await button.getAttribute('data-id');
   await button.click(); quantities[id]=(quantities[id]||0)+1;
   const cart=await page.evaluate(()=>getCart()); const item=cart.find(x=>x.id===id);
   assert.equal(item.name,original[id].name);assert.equal(item.price,+original[id].price);assert.equal(item.image,original[id].image);assert.equal(item.quantity,quantities[id]);
  }
  await page.waitForTimeout(50);
  assert.equal(await page.locator('#menu-bag-count').textContent(),'14 items');
  assert.equal(await page.locator('#menu-bag-total').textContent(),'$82.10');
  assert(await page.locator('#menu-bag-bar').isVisible());
  await page.locator('#menu-bag-bar').click();
  await page.waitForFunction(()=>!document.getElementById('cart-sidebar').classList.contains('translate-x-full'));
  const images=await page.locator('#cart-items-container img').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),alt:n.alt,loaded:n.complete&&n.naturalWidth>0})));
  assert.equal(images.length,9);
  for(const i of images){assert(i.loaded);assert(Object.values(original).some(x=>x.image===i.src&&x.name===i.alt));}
  await page.screenshot({path:`${out}/cart-375.png`});
  await page.locator('#close-cart-btn').click();await page.waitForTimeout(350);
  return {added:14,distinct:9,subtotal:'$82.10',drawerImages:images};
 });
 await check('Phone bag persists and follows deletion and emptied cart',async()=>{
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#menu-bag-count').textContent(),'14 items');
  await page.locator('#menu-bag-bar').click();await page.waitForTimeout(50);
  await page.locator('#cart-items-container button').first().click();await page.waitForTimeout(50);
  assert.equal(await page.locator('#menu-bag-count').textContent(),'12 items');
  await page.locator('#close-cart-btn').click();await page.waitForTimeout(350);
  await page.evaluate(()=>saveCart([]));await page.waitForTimeout(50);
  assert(await page.locator('#menu-bag-bar').isHidden());
  assert.equal(await page.evaluate(()=>document.body.classList.contains('menu-has-items')),false);
  const other=await context.newPage();await other.goto('https://samosamanvt.com/burlington.html',{waitUntil:'networkidle'});
  await other.evaluate(()=>addToCart('steak-cheese','Steak & Cheese Samosa',3.75,'assets/samosas/steakandcheese.webp'));
  await page.waitForFunction(()=>document.getElementById('menu-bag-count').textContent==='1 item');
  assert.equal(await page.locator('#menu-bag-total').textContent(),'$3.75');
  await other.close();await page.evaluate(()=>saveCart([]));
  return {reload:true,delete:true,empty:true,crossTab:true};
 });
 await check('Pickup / Delivery survives reload and does not change checkout',async()=>{
  await page.evaluate(()=>scrollTo(0,0));
  for(const type of ['delivery','pickup']){
   await page.locator(`[data-order-type="${type}"]`).click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('samosaman_order_type')),type);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator(`[data-order-type="${type}"]`).getAttribute('aria-pressed'),'true');
   assert(page.url().includes('/burlington.html'));
  }
  return {delivery:true,pickup:true};
 });
 await check('Order preference remains usable when storage throws',async()=>{
  const blocked=await browser.newContext({viewport:{width:375,height:844}});
  await blocked.addInitScript(()=>{
   const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
   Storage.prototype.getItem=function(k){if(k==='samosaman_order_type')throw new DOMException('Blocked','SecurityError');return get.call(this,k);};
   Storage.prototype.setItem=function(k,v){if(k==='samosaman_order_type')throw new DOMException('Blocked','QuotaExceededError');return set.call(this,k,v);};
  });
  const p=await blocked.newPage(),localErrors=[];p.on('pageerror',e=>localErrors.push(e.message));
  await p.goto('https://samosamanvt.com/burlington.html',{waitUntil:'networkidle'});
  assert.equal(await p.locator('[data-order-type="pickup"]').getAttribute('aria-pressed'),'true');
  await p.locator('[data-order-type="delivery"]').click();assert.equal(await p.locator('[data-order-type="delivery"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(localErrors,[]);await blocked.close();return {default:'pickup',selectionWorks:true};
 });
 await check('New York opening boundaries, weekday/weekend and DST are correct in another browser timezone',async()=>{
  const cases=[
   ['2026-10-12T13:59:00Z','Closed · opens today at 10 AM',false],
   ['2026-10-12T14:00:00Z','Open now · until 9 PM',true],
   ['2026-10-13T00:59:00Z','Open now · until 9 PM',true],
   ['2026-10-13T01:00:00Z','Closed · opens tomorrow at 10 AM',false],
   ['2026-10-16T14:00:00Z','Open now · until 10 PM',true],
   ['2026-10-17T01:59:00Z','Open now · until 10 PM',true],
   ['2026-10-17T02:00:00Z','Closed · opens tomorrow at 10 AM',false],
   ['2026-10-18T14:00:00Z','Open now · until 8 PM',true],
   ['2026-10-19T00:00:00Z','Closed · opens tomorrow at 10 AM',false],
   ['2026-03-08T07:30:00Z','Closed · opens today at 10 AM',false],
   ['2026-12-07T15:00:00Z','Open now · until 9 PM',true]
  ];
  for(const [date,text,open]of cases){const status=await page.evaluate(date=>{updateHoursStatus(new Date(date));return {text:document.getElementById('hours-status-text').textContent,open:document.getElementById('menu-hours-trigger').dataset.open};},date);assert.equal(status.text,text,date);assert.equal(status.open,String(open),date);}
  assert.deepEqual(await page.locator('#menu-hours-list dd').allTextContents(),['10 AM – 9 PM','10 AM – 10 PM','10 AM – 8 PM']);
  assert.equal(await page.locator('#modal-hours-list > div').count(),3);
  await page.evaluate(()=>updateHoursStatus());return {cases:cases.length,browserTimezone:'Asia/Tokyo'};
 });
 await check('Hours modal opens, contains keyboard focus, closes on Escape and restores focus',async()=>{
  await page.locator('#menu-hours-trigger').click();
  assert(await page.locator('#hours-modal').isVisible());
  assert.equal(await page.locator('#menu-hours-trigger').getAttribute('aria-expanded'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'hours-close-btn');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'hours-close-btn');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'hours-close-btn');
  await page.screenshot({path:`${out}/hours-375.png`});
  await page.keyboard.press('Escape');await page.waitForTimeout(350);
  assert(await page.locator('#hours-modal').isHidden());assert.equal(await page.evaluate(()=>document.activeElement.id),'menu-hours-trigger');
  return {focusTrap:true,escape:true,restored:true};
 });
 const layouts=[];
 for(const width of [375,430,768,1024,1100,1440,1920]) await check(`Responsive layout, category jumps and scroll-spy at ${width}px`,async()=>{
  await page.setViewportSize({width,height:width<768?844:1000});
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const controls=await page.locator('.menu-main button,.menu-category,.menu-catering-link,.menu-info a').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({name:n.textContent.trim(),height:n.getBoundingClientRect().height,fonts:getComputedStyle(n).fontSize})));
  controls.forEach(c=>assert(c.height>=34,`${c.name} ${c.height}px`));
  await page.screenshot({path:`${out}/top-${width}.png`});
  const ids=['best-sellers','meat-samosas','vegetarian-samosas','meals'];
  for(const id of ids){
   await page.locator(`a.menu-category[href="#${id}"]`).click();await page.waitForTimeout(800);
   const state=await page.evaluate(id=>({active:document.querySelector('.menu-category[aria-current]')?.hash,top:document.querySelector(`#${id} h2`).getBoundingClientRect().top,navTop:document.querySelector('.menu-sidebar').getBoundingClientRect().top,navBottom:document.querySelector('.menu-sidebar').getBoundingClientRect().bottom}),id);
   assert.equal(state.active,'#'+id);assert(state.top>= (width<768?state.navBottom:80),`${id} is obscured`);assert(Math.abs(state.navTop-(width<768?80:104))<1);
   if(id==='meat-samosas') await page.screenshot({path:`${out}/scrolled-${width}.png`});
  }
  for(const id of [...ids].reverse()){
   await page.evaluate(id=>{const s=document.getElementById(id);const offset=parseFloat(getComputedStyle(document.body).getPropertyValue('--menu-scroll-offset'));scrollTo({top:scrollY+s.getBoundingClientRect().top-offset,behavior:'instant'});},id);
   await page.waitForTimeout(100);assert.equal(await page.locator('.menu-category[aria-current]').getAttribute('href'),'#'+id);
  }
  const carousel=page.locator('.menu-carousel');
  await carousel.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);
  assert(await carousel.evaluate(n=>n.scrollLeft)>0,'Keyboard carousel did not scroll');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const item={width,noOverflow:true,minimumControlHeight:Math.min(...controls.map(c=>c.height)),activeSections:ids.length,keyboardCarousel:true};layouts.push(item);return item;
 });
 await check('Counter clears the photo hand-off across tablet and desktop widths',async()=>{
  const sweep=[];
  for(let width=768;width<=1440;width+=16){await page.setViewportSize({width,height:900});const r=await page.evaluate(()=>{
   const image=document.querySelector('.menu-hero img'),box=image.getBoundingClientRect(),card=document.querySelector('.menu-counter').getBoundingClientRect(),scale=Math.max(box.width/image.naturalWidth,box.height/image.naturalHeight);
   // Conservative source-image bounds around the samosas and receiving hand.
   const x=box.x+(box.width-image.naturalWidth*scale)*.5,y=box.y+(box.height-image.naturalHeight*scale)*.18;
   const handoff={left:x+940*scale,right:x+1310*scale,top:y+950*scale,bottom:y+1210*scale};
   const overlaps=card.left<handoff.right&&card.right>handoff.left&&card.top<handoff.bottom&&card.bottom>handoff.top;
   return {width:innerWidth,overlaps,gap:card.left-handoff.right};
  });assert.equal(r.overlaps,false,`Photo overlap at ${width}px`);sweep.push(r);}
  return {samples:sweep.length,minimumHorizontalClearance:Math.min(...sweep.map(x=>x.gap)),sourceHandoffBounds:[940,950,1310,1210]};
 });
 await check('Reduced motion removes transitions and category jumps are immediate',async()=>{
  await page.setViewportSize({width:375,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>scrollTo(0,0));
  await page.locator('a.menu-category[href="#meals"]').click();
  const state=await page.evaluate(()=>({top:document.getElementById('meals').getBoundingClientRect().top,offset:parseFloat(getComputedStyle(document.body).getPropertyValue('--menu-scroll-offset')),duration:getComputedStyle(document.querySelector('.menu-card img')).transitionDuration}));
  assert(Math.abs(state.top-state.offset)<2);assert.equal(state.duration,'0s');
  return state;
 });
 await check('Menu keyboard focus has the required orange 2px ring',async()=>{
  await page.locator('[data-order-type="pickup"]').focus();await page.keyboard.press('Tab');
  const focus=await page.evaluate(()=>({control:document.activeElement.dataset.orderType,width:getComputedStyle(document.activeElement).outlineWidth,color:getComputedStyle(document.activeElement).outlineColor,visible:document.activeElement.matches(':focus-visible')}));
  assert.equal(focus.control,'delivery');assert.equal(focus.width,'2px');assert.equal(focus.color,'rgb(185, 67, 22)');assert(focus.visible);return focus;
 });
 await check('Hero priority, lazy menu images, pinned-free icons and catering destination',async()=>{
  const attrs=await page.evaluate(()=>({hero:{loading:document.querySelector('.menu-hero img').loading,priority:document.querySelector('.menu-hero img').fetchPriority},lazy:[...document.querySelectorAll('.menu-main img:not(.menu-hero img)')].every(i=>i.loading==='lazy'),unversioned:[...document.scripts].some(s=>s.src.includes('lucide@latest')),catering:document.querySelector('.menu-catering-link').getAttribute('href')}));
  assert.equal(attrs.hero.loading,'eager');assert.equal(attrs.hero.priority,'high');assert(attrs.lazy);assert(!attrs.unversioned);assert.equal(attrs.catering,'catering.html');return attrs;
 });
 await check('Automated accessibility audit of redesigned menu has no violations',async()=>{
  await page.evaluate(()=>scrollTo(0,0));await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>(await axe.run({include:[['#menu-main'],['#hours-modal'],['#menu-bag-bar']]})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
  assert.deepEqual(violations,[]);return {violations:0};
 });
 await check('No browser runtime errors',async()=>{assert.deepEqual(errors,[]);return {errors};});
 const report={url:'https://samosamanvt.com/burlington.html',time:new Date().toISOString(),passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
 fs.writeFileSync(`${out}/acceptance-results.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,failed:report.failed,failures:results.filter(x=>!x.pass)},null,2));
 await browser.close(); if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
