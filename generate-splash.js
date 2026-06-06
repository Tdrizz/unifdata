/**
 * UnifData PWA Splash Screen Generator
 * Generates iOS splash screens for every device at exact required dimensions.
 * Run: node scripts/generate-splash.mjs
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ICON_SRC = path.join(ROOT, "public/icons/icon-512.png");
const OUTPUT_DIR = path.join(ROOT, "public/icons/splash");

// Light and dark background colors from the design system
const BG_LIGHT = "#f4f3f0";
const BG_DARK = "#090e1a";

// Icon size on splash — 120px looks right across all screen densities
const ICON_SIZE = 120;

// iOS splash screen dimensions (width x height) — portrait orientation
// Source: Apple HIG + WebKit requirements as of iOS 17
const DEVICES = [
  // iPhone
  { name: "iphone-se",         w: 640,  h: 1136, scale: 2 },
  { name: "iphone-8",          w: 750,  h: 1334, scale: 2 },
  { name: "iphone-8-plus",     w: 1242, h: 2208, scale: 3 },
  { name: "iphone-x",          w: 1125, h: 2436, scale: 3 },
  { name: "iphone-xr",         w: 828,  h: 1792, scale: 2 },
  { name: "iphone-xs-max",     w: 1242, h: 2688, scale: 3 },
  { name: "iphone-12-mini",    w: 1080, h: 2340, scale: 3 },
  { name: "iphone-12",         w: 1170, h: 2532, scale: 3 },
  { name: "iphone-12-pro-max", w: 1284, h: 2778, scale: 3 },
  { name: "iphone-14",         w: 1179, h: 2556, scale: 3 },
  { name: "iphone-14-plus",    w: 1284, h: 2778, scale: 3 },
  { name: "iphone-14-pro",     w: 1179, h: 2556, scale: 3 },
  { name: "iphone-14-pro-max", w: 1290, h: 2796, scale: 3 },
  { name: "iphone-15",         w: 1179, h: 2556, scale: 3 },
  { name: "iphone-15-pro-max", w: 1290, h: 2796, scale: 3 },
  // iPad
  { name: "ipad-mini",         w: 1536, h: 2048, scale: 2 },
  { name: "ipad-air",          w: 1640, h: 2360, scale: 2 },
  { name: "ipad-pro-11",       w: 1668, h: 2388, scale: 2 },
  { name: "ipad-pro-12",       w: 2048, h: 2732, scale: 2 },
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

async function generateSplash(device, bg, suffix) {
  const { w, h, name } = device;
  const { r, g, b } = hexToRgb(bg);
  const iconPx = Math.round(ICON_SIZE * device.scale);

  // Resize icon
  const iconBuf = await sharp(ICON_SRC)
    .resize(iconPx, iconPx, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Center position
  const left = Math.round((w - iconPx) / 2);
  const top = Math.round((h - iconPx) / 2);

  const filename = `${name}-${suffix}.png`;
  const outPath = path.join(OUTPUT_DIR, filename);

  await sharp({
    create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } },
  })
    .composite([{ input: iconBuf, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  return { filename, w, h };
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Generating ${DEVICES.length * 2} splash screens...\n`);

  const metaTags = [];

  for (const device of DEVICES) {
    // Light
    const light = await generateSplash(device, BG_LIGHT, "light");
    // Dark
    const dark = await generateSplash(device, BG_DARK, "dark");

    const mediaLight = `(device-width: ${device.w / device.scale}px) and (device-height: ${device.h / device.scale}px) and (-webkit-device-pixel-ratio: ${device.scale}) and (prefers-color-scheme: light)`;
    const mediaDark = `(device-width: ${device.w / device.scale}px) and (device-height: ${device.h / device.scale}px) and (-webkit-device-pixel-ratio: ${device.scale}) and (prefers-color-scheme: dark)`;

    metaTags.push(`    <link rel="apple-touch-startup-image" media="${mediaLight}" href="/icons/splash/${light.filename}" />`);
    metaTags.push(`    <link rel="apple-touch-startup-image" media="${mediaDark}" href="/icons/splash/${dark.filename}" />`);

    console.log(`✓ ${device.name} (${device.w}×${device.h})`);
  }

  // Write meta tags to a file for easy copy-paste into layout.tsx
  const metaOutput = path.join(ROOT, "scripts/splash-meta-tags.txt");
  fs.writeFileSync(metaOutput, metaTags.join("\n"));

  console.log(`\n✓ Done. ${DEVICES.length * 2} files written to public/icons/splash/`);
  console.log(`✓ Meta tags written to scripts/splash-meta-tags.txt`);
  console.log(`\nNext step: add the meta tags to src/app/layout.tsx`);
  console.log(`See scripts/splash-meta-tags.txt for the full list to paste in.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
