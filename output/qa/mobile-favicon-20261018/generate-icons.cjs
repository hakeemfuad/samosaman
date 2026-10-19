const sharp = require('/Users/hakeem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../Website/public');
(async () => {
  const mark = await sharp(path.join(root, 'assets/m_logo.svg')).resize({height: 880}).png().toBuffer();
  const square = await sharp({create:{width:1024,height:1024,channels:3,background:'#f7f3ea'}})
    .composite([{input:mark,gravity:'centre'}]).png().toBuffer();
  for (const [name,size] of [['apple-touch-icon.png',180],['favicon-16x16.png',16],['favicon-32x32.png',32],['android-chrome-192x192.png',192],['android-chrome-512x512.png',512]]) {
    await sharp(square).resize(size,size).png().toFile(path.join(root,name));
  }
  await fs.writeFile('/private/tmp/samosaman-favicon-master.png',square);
})();
