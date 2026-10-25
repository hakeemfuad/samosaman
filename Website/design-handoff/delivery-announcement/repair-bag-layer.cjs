const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const folder = __dirname;
const sourcePath = path.resolve(folder, '../../public/assets/yellow_heart.png');
const artworkPath = path.join(folder, 'samosaman-doordash-logo-v8-left-spill.png');
const width = 2080;
const height = 1280;
const offset = { x: 160, y: 200 };
const protectedStartY = 469;

function insidePolygon(x, y, points) {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}

async function main() {
  const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const approved = await sharp(artworkPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = Buffer.from(source.data);
  // Retain the original man and typography. Remove only the old orange samosa.
  for (let y = 80; y < protectedStartY; y++) {
    for (let x = 460; x < 905; x++) {
      const i = (y * source.info.width + x) * 4;
      const [r, g, b] = base.subarray(i, i + 3);
      if (Math.max(r, g, b) > 70) base.fill(0, i, i + 4);
    }
  }
  const basePng = await sharp(base, { raw: source.info }).png().toBuffer();
  await fs.writeFile(path.join(folder, 'original-logo-fixed-layer-v10.png'), basePng);

  // Isolate the approved bag and samosas without retaining generated lettering or figure.
  const artW = 910;
  const artH = 565;
  const overflow = Buffer.alloc(artW * artH * 4);
  const symbol = Buffer.alloc(artW * artH * 4);
  const bagOutline = [[587, 268], [848, 343], [778, 555], [510, 462]];
  for (let y = 0; y < artH; y++) {
    for (let x = 0; x < artW; x++) {
      const input = (y * approved.info.width + x) * 4;
      const output = (y * artW + x) * 4;
      const [r, g, b, a] = approved.data.subarray(input, input + 4);
      const orange = r > 100 && g > 45 && r > g * 1.2 && g > b * 1.7;
      const navy = b > 25 && b > r * 1.3 && b > g * 1.1;
      if (a && (orange || navy) && (y < 340 || x < 500)) {
        approved.data.copy(overflow, output, input, input + 4);
      }
      if (a && x > 590 && x < 710 && y > 320 && y < 430 && r > 170 && g > 60 && b > 20) {
        symbol[output] = 255;
        symbol[output + 1] = 255;
        symbol[output + 2] = 255;
        symbol[output + 3] = Math.round(Math.min(1, b / 250) * a);
      }
    }
  }
  const rawArt = { width: artW, height: artH, channels: 4 };
  const overflowPng = await sharp(overflow, { raw: rawArt }).png().toBuffer();
  const symbolPng = await sharp(symbol, { raw: rawArt }).png().toBuffer();
  // Rebuild the full bag geometry rather than carrying the old figure's cutouts.
  const bagSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${artW}" height="${artH}">
    <defs><linearGradient id="front" x1="0" y1="0" x2="0.3" y2="1"><stop stop-color="#ff2603"/><stop offset="1" stop-color="#ff3401"/></linearGradient></defs>
    <path d="M587 268 L848 343 L778 555 L510 462 Z" fill="url(#front)"/>
    <path d="M752 315.4 L794 327.5 L722 535.7 L680 521.2 Z" fill="#c42103"/>
    <path d="M794 327.5 L848 343 L778 555 L722 535.7 Z" fill="#ff3305"/>
    <image width="${artW}" height="${artH}" href="data:image/png;base64,${symbolPng.toString('base64')}"/>
    <image width="${artW}" height="${artH}" href="data:image/png;base64,${overflowPng.toString('base64')}"/>
  </svg>`;
  const artPng = await sharp(Buffer.from(bagSvg)).png().toBuffer();
  await fs.writeFile(path.join(folder, 'delivery-artwork-layer-v10.png'), artPng);
  await fs.writeFile(path.join(folder, 'delivery-artwork-layer-v10.svg'), bagSvg);
  const bagRaw = await sharp(artPng).ensureAlpha().raw().toBuffer();
  let bagInteriorHoles = 0;
  for (let y = 268; y < 556; y++) {
    for (let x = 510; x < 849; x++) {
      const inset = bagOutline.every(([ax, ay], j) => {
        const [bx, by] = bagOutline[(j + 1) % bagOutline.length];
        return ((bx - ax) * (y + .5 - ay) - (by - ay) * (x + .5 - ax)) / Math.hypot(bx - ax, by - ay) > 3;
      });
      if (inset && bagRaw[(y * artW + x) * 4 + 3] < 245) bagInteriorHoles++;
    }
  }
  if (bagInteriorHoles) throw new Error(`Bag still has ${bagInteriorHoles} clipped interior pixels.`);

  // Align the existing bag to the original two hand positions. Only the artwork is transformed.
  const angle = -5 * Math.PI / 180;
  const scale = 1.18;
  const a = scale * Math.cos(angle);
  const b = scale * Math.sin(angle);
  const tx = 526 - (a * 563 - b * 363);
  const ty = 228 - (b * 563 + a * 363);
  const artImage = `<image width="${artW}" height="${artH}" href="data:image/png;base64,${artPng.toString('base64')}" transform="matrix(${a} ${b} ${-b} ${a} ${tx} ${ty})"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>SamosaMan delivery logo with original fixed lettering</title>
  <defs>
    <clipPath id="above-lettering"><rect x="-160" y="-200" width="2080" height="669"/></clipPath>
    <clipPath id="right-hand"><rect x="740" y="350" width="115" height="110"/></clipPath>
  </defs>
  <g transform="translate(${offset.x} ${offset.y})">
    <g clip-path="url(#above-lettering)">${artImage}</g>
    <image width="1920" height="1080" href="data:image/png;base64,${basePng.toString('base64')}"/>
    <g clip-path="url(#right-hand)">${artImage}</g>
  </g>
</svg>`;
  await fs.writeFile(path.join(folder, 'samosaman-doordash-logo-v10-layered.svg'), svg);
  const composite = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Exact RGBA copy: this avoids renderer rounding at partly transparent letter edges.
  for (let y = protectedStartY; y < source.info.height; y++) {
    const start = y * source.info.width * 4;
    const destination = ((y + offset.y) * width + offset.x) * 4;
    source.data.copy(composite.data, destination, start, start + source.info.width * 4);
  }
  const finalPath = path.join(folder, 'samosaman-doordash-logo-v10-repaired-bag.png');
  await sharp(composite.data, { raw: composite.info }).png().toFile(finalPath);
  const final = await sharp(finalPath).ensureAlpha().raw().toBuffer();
  let changedPixels = 0;
  let comparedPixels = 0;
  for (let y = protectedStartY; y < source.info.height; y++) {
    for (let x = 0; x < source.info.width; x++) {
      const from = (y * source.info.width + x) * 4;
      const to = ((y + offset.y) * width + x + offset.x) * 4;
      comparedPixels++;
      if (!source.data.subarray(from, from + 4).equals(final.subarray(to, to + 4))) changedPixels++;
    }
  }
  const validation = { originalSource: sourcePath, approvedIllustration: artworkPath, finalPath, width, height, sourceOffset: offset, protectedSourceRegion: { x: 0, y: protectedStartY, width: 1920, height: 1080 - protectedStartY }, comparedPixels, changedPixels, bagInteriorHoles, method: 'Full bag geometry restored with original figure and fixed source lettering. Source typography is copied without scaling or recoloring.' };
  await fs.writeFile(path.join(folder, 'v10-validation.json'), JSON.stringify(validation, null, 2) + '\n');
  if (changedPixels) throw new Error('Original lettering was modified.');
  await sharp(finalPath).flatten({ background: '#ffffff' }).resize({ width: 1300 }).png().toFile(path.join(folder, 'samosaman-doordash-logo-v10-white-preview.png'));
  await sharp(finalPath).extract({left:580,top:370,width:460,height:330}).flatten({background:'#ffffff'}).resize({width:920}).png().toFile(path.join(folder, 'v10-bag-detail.png'));
  console.log(JSON.stringify(validation, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
