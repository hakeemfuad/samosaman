const {chromium,devices} = require('/Users/hakeem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs/promises');
(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const context=await browser.newContext({...devices['iPhone 13'],defaultBrowserType:undefined});
    // Keep the check local and prevent analytics, auth, or other third-party requests.
    await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4287/',{waitUntil:'domcontentloaded'});
    const result=await page.evaluate(async()=>{
      const icons=[...document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]')];
      const loaded=[];
      for(const link of icons){
        const img=new Image(); img.src=link.href; await img.decode();
        loaded.push({rel:link.rel,path:new URL(link.href).pathname,width:img.naturalWidth,height:img.naturalHeight});
      }
      return {viewport:innerWidth,icons:loaded};
    });
    if(result.icons.length!==5) throw Error('Icon link count mismatch');
    if(!result.icons.some(i=>i.rel==='apple-touch-icon'&&i.width===180&&i.height===180)) throw Error('Touch icon did not decode');
    await fs.writeFile(__dirname+'/browser-verification.json',JSON.stringify(result,null,2)+'\n');
    console.log('PASS: all 5 declared icon images decoded in a 390px mobile Chromium session.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
