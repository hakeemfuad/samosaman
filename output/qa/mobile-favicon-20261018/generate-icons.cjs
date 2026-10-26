const sharp = require('/Users/hakeem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../Website/public');
(async () => {
  const mark = await sharp(path.join(root, 'assets/m_logo.svg')).resize({height: 880}).png().toBuffer();
  const tabIcon = await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:mark,gravity:'centre'}]).png().toBuffer();
  // Home-screen icons use an opaque background. Browser tabs need transparency.
  const touchIcon = await sharp({create:{width:1024,height:1024,channels:3,background:'#f7f3ea'}})
    .composite([{input:mark,gravity:'centre'}]).png().toBuffer();
  for (const [name,size] of [['apple-touch-icon.png',180],['android-chrome-192x192.png',192],['android-chrome-512x512.png',512]]) {
    await sharp(touchIcon).resize(size,size).png().toFile(path.join(root,name));
  }
  for (const size of [16,32]) {
    await sharp(tabIcon).resize(size,size).png().toFile(path.join(root,`favicon-${size}x${size}.png`));
  }
  // ICO supports PNG frames; retain alpha in every size, including 48px.
  const sizes = [16,32,48];
  const frames = await Promise.all(sizes.map(size=>sharp(tabIcon).resize(size,size).png().toBuffer()));
  const directory = Buffer.alloc(6 + frames.length * 16);
  directory.writeUInt16LE(1,2);
  directory.writeUInt16LE(frames.length,4);
  let offset = directory.length;
  frames.forEach((frame,index)=>{
    const entry = 6 + index * 16;
    directory[entry] = sizes[index];
    directory[entry+1] = sizes[index];
    directory.writeUInt16LE(1,entry+4);
    directory.writeUInt16LE(32,entry+6);
    directory.writeUInt32LE(frame.length,entry+8);
    directory.writeUInt32LE(offset,entry+12);
    offset += frame.length;
  });
  await fs.writeFile(path.join(root,'favicon.ico'),Buffer.concat([directory,...frames]));
})();
