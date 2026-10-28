// scripts/generate-pwa-icons.js
// Generates fully opaque solid golden-yellow to orange gradient PWA icons
// for Beerlao POS / LBC Order Android PWA

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ICONS_DIR = path.join(ROOT_DIR, 'icons');
const PUBLIC_ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

[ICONS_DIR, PUBLIC_ICONS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('1. Preparing source assets...');
const SOURCE_IMG = path.join(PUBLIC_DIR, 'assets/aistudio/Glossy_Golden_Beerlao_App_Icon_5f7de793.png');
if (!fs.existsSync(SOURCE_IMG)) {
  console.error('Source image not found:', SOURCE_IMG);
  process.exit(1);
}

// 1. Remove white corners from source squircle using corner floodfill
execSync(
  `convert "${SOURCE_IMG}" -matte -fuzz 10% -fill none ` +
  `-draw "matte 0,0 floodfill" ` +
  `-draw "matte 1253,0 floodfill" ` +
  `-draw "matte 0,1253 floodfill" ` +
  `-draw "matte 1253,1253 floodfill" /tmp/button_transparent_corners.png`
);

// 2. Create the pristine 1254x1254 golden-yellow to deep orange gradient canvas
// Top: #FEE05C (warm sunny gold) -> Bottom: #E87600 (rich amber orange)
execSync(`convert -size 1254x1254 gradient:"#FEE05C"-"#E87600" /tmp/canvas_1254.png`);

// 3. Composite button onto the 1254x1254 solid gradient canvas (0 white pixels)
execSync(`composite /tmp/button_transparent_corners.png /tmp/canvas_1254.png /tmp/full_golden_1254.png`);

console.log('2. Generating Standard Icon (purpose: "any")...');
// Standard 512x512 icon: logo width ~420px (82% scale) centered on 512x512 solid gradient
execSync(`convert -size 512x512 gradient:"#FEE05C"-"#E87600" /tmp/bg_512.png`);
execSync(`convert /tmp/full_golden_1254.png -resize 440x440 /tmp/standard_layer_440.png`);
execSync(
  `convert -size 440x440 xc:black -fill white ` +
  `-draw "roundrectangle 15,15 425,425 40,40" -blur 0x12 /tmp/mask_440.png`
);
execSync(`convert /tmp/standard_layer_440.png /tmp/mask_440.png -alpha off -compose CopyOpacity -composite /tmp/standard_layer_feathered.png`);
execSync(`composite -gravity center /tmp/standard_layer_feathered.png /tmp/bg_512.png /tmp/icon-512-raw.png`);
// Ensure 8-bit PNG for maximum Android / browser compatibility
execSync(`convert /tmp/icon-512-raw.png -depth 8 -type TrueColor /tmp/icon-512.png`);

// Standard 192x192 icon
execSync(`convert /tmp/icon-512.png -resize 192x192 -depth 8 -type TrueColor /tmp/icon-192.png`);

console.log('3. Generating Maskable Icon (purpose: "maskable")...');
// Maskable 512x512 icon: logo width ~350px (68% scale, safely inside Android 410px safe circle)
execSync(`convert /tmp/full_golden_1254.png -resize 380x380 /tmp/maskable_layer_380.png`);
execSync(
  `convert -size 380x380 xc:black -fill white ` +
  `-draw "roundrectangle 20,20 360,360 40,40" -blur 0x15 /tmp/mask_380.png`
);
execSync(`convert /tmp/maskable_layer_380.png /tmp/mask_380.png -alpha off -compose CopyOpacity -composite /tmp/maskable_layer_feathered.png`);
execSync(`composite -gravity center /tmp/maskable_layer_feathered.png /tmp/bg_512.png /tmp/icon-512-maskable-raw.png`);
execSync(`convert /tmp/icon-512-maskable-raw.png -depth 8 -type TrueColor /tmp/icon-512-maskable.png`);

// Maskable 192x192 icon
execSync(`convert /tmp/icon-512-maskable.png -resize 192x192 -depth 8 -type TrueColor /tmp/icon-192-maskable.png`);

console.log('4. Generating Apple Touch Icon (180x180)...');
execSync(`convert /tmp/icon-512.png -resize 180x180 -depth 8 -type TrueColor /tmp/apple-touch-icon.png`);

console.log('5. Generating Favicons...');
execSync(`convert /tmp/icon-512.png -resize 32x32 -depth 8 -type TrueColor /tmp/favicon-32x32.png`);
execSync(`convert /tmp/icon-512.png -resize 16x16 -depth 8 -type TrueColor /tmp/favicon-16x16.png`);
execSync(`convert /tmp/favicon-32x32.png /tmp/favicon-16x16.png /tmp/favicon.ico`);

console.log('6. Copying generated assets to public/ and icons/ folders...');
const filesToDeploy = [
  { src: '/tmp/icon-512.png', dests: ['icons/icon-512.png', 'public/icons/icon-512.png'] },
  { src: '/tmp/icon-192.png', dests: ['icons/icon-192.png', 'public/icons/icon-192.png'] },
  { src: '/tmp/icon-512-maskable.png', dests: [
      'icons/icon-512-maskable.png',
      'public/icons/icon-512-maskable.png',
      'icons/maskable-512.png',
      'public/icons/maskable-512.png'
    ]
  },
  { src: '/tmp/icon-192-maskable.png', dests: ['icons/icon-192-maskable.png', 'public/icons/icon-192-maskable.png'] },
  { src: '/tmp/apple-touch-icon.png', dests: [
      'apple-touch-icon.png',
      'public/apple-touch-icon.png',
      'icons/apple-touch-icon.png',
      'public/icons/apple-touch-icon.png'
    ]
  },
  { src: '/tmp/favicon.ico', dests: ['favicon.ico', 'public/favicon.ico'] },
  { src: '/tmp/favicon-32x32.png', dests: ['favicon-32x32.png', 'public/favicon-32x32.png'] }
];

filesToDeploy.forEach(({ src, dests }) => {
  dests.forEach((destRel) => {
    const destFull = path.join(ROOT_DIR, destRel);
    fs.copyFileSync(src, destFull);
    console.log(` -> Copied ${src} to ${destRel}`);
  });
});

console.log('All icons generated and deployed successfully!');
