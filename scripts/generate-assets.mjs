import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '../assets');

// librsvg はシステムフォント（fontconfig）を参照するため font-family 名を直接使う
const fontFace = ``;

// ── SVG テンプレート ──────────────────────────────────────────

const iconSvg = (size = 1024) => `<svg viewBox="0 0 512 512" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F7F3EE"/>
      <stop offset="100%" stop-color="#EDE5DB"/>
    </linearGradient>
    <linearGradient id="foot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C4623A"/>
      <stop offset="100%" stop-color="#A04D2C"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- 左足（薄め） -->
  <g transform="translate(256,256) rotate(-14) translate(-256,-256)" opacity="0.24">
    <path d="M186,290 C172,295 164,313 165,334 C166,358 175,386 189,401 C200,414 214,419 224,413 C237,405 242,385 239,359 C236,330 224,298 208,287 C200,281 190,282 186,290 Z" fill="url(#foot)"/>
    <ellipse cx="174" cy="274" rx="16" ry="20" fill="url(#foot)"/>
    <ellipse cx="192" cy="263" rx="14" ry="17" fill="url(#foot)"/>
    <ellipse cx="211" cy="259" rx="13" ry="16" fill="url(#foot)"/>
    <ellipse cx="228" cy="263" rx="11" ry="14" fill="url(#foot)"/>
    <ellipse cx="243" cy="272" rx="9"  ry="12" fill="url(#foot)"/>
  </g>
  <!-- 右足（メイン） -->
  <g transform="translate(256,256) rotate(14) translate(-256,-256)">
    <path d="M268,146 C254,151 246,170 247,192 C248,218 258,250 274,267 C286,280 300,285 312,279 C326,270 331,249 328,221 C325,191 312,156 295,144 C286,138 275,138 268,146 Z" fill="url(#foot)" opacity="0.90"/>
    <ellipse cx="255" cy="129" rx="19" ry="23" fill="url(#foot)" opacity="0.88"/>
    <ellipse cx="274" cy="117" rx="16" ry="20" fill="url(#foot)" opacity="0.85"/>
    <ellipse cx="294" cy="112" rx="15" ry="18" fill="url(#foot)" opacity="0.82"/>
    <ellipse cx="312" cy="117" rx="13" ry="16" fill="url(#foot)" opacity="0.78"/>
    <ellipse cx="328" cy="128" rx="11" ry="14" fill="url(#foot)" opacity="0.73"/>
  </g>
  <!-- 軌跡の点 -->
  <circle cx="368" cy="80" r="7" fill="#C4623A" opacity="0.24"/>
  <circle cx="396" cy="56" r="5" fill="#C4623A" opacity="0.14"/>
  <circle cx="420" cy="36" r="4" fill="#C4623A" opacity="0.08"/>
</svg>`;

// Android foreground: 透明背景 + 足跡（セーフゾーン内に収める 66%）
const androidForegroundSvg = (size = 1024) => `<svg viewBox="0 0 512 512" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="foot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C4623A"/>
      <stop offset="100%" stop-color="#A04D2C"/>
    </linearGradient>
  </defs>
  <!-- 左足（薄め） -->
  <g transform="translate(256,256) rotate(-14) translate(-256,-256)" opacity="0.30">
    <path d="M186,290 C172,295 164,313 165,334 C166,358 175,386 189,401 C200,414 214,419 224,413 C237,405 242,385 239,359 C236,330 224,298 208,287 C200,281 190,282 186,290 Z" fill="url(#foot)"/>
    <ellipse cx="174" cy="274" rx="16" ry="20" fill="url(#foot)"/>
    <ellipse cx="192" cy="263" rx="14" ry="17" fill="url(#foot)"/>
    <ellipse cx="211" cy="259" rx="13" ry="16" fill="url(#foot)"/>
    <ellipse cx="228" cy="263" rx="11" ry="14" fill="url(#foot)"/>
    <ellipse cx="243" cy="272" rx="9"  ry="12" fill="url(#foot)"/>
  </g>
  <!-- 右足（メイン） -->
  <g transform="translate(256,256) rotate(14) translate(-256,-256)">
    <path d="M268,146 C254,151 246,170 247,192 C248,218 258,250 274,267 C286,280 300,285 312,279 C326,270 331,249 328,221 C325,191 312,156 295,144 C286,138 275,138 268,146 Z" fill="url(#foot)" opacity="0.90"/>
    <ellipse cx="255" cy="129" rx="19" ry="23" fill="url(#foot)" opacity="0.88"/>
    <ellipse cx="274" cy="117" rx="16" ry="20" fill="url(#foot)" opacity="0.85"/>
    <ellipse cx="294" cy="112" rx="15" ry="18" fill="url(#foot)" opacity="0.82"/>
    <ellipse cx="312" cy="117" rx="13" ry="16" fill="url(#foot)" opacity="0.78"/>
    <ellipse cx="328" cy="128" rx="11" ry="14" fill="url(#foot)" opacity="0.73"/>
  </g>
  <circle cx="368" cy="80" r="7" fill="#C4623A" opacity="0.24"/>
  <circle cx="396" cy="56" r="5" fill="#C4623A" opacity="0.14"/>
  <circle cx="420" cy="36" r="4" fill="#C4623A" opacity="0.08"/>
</svg>`;

// Android background: クリーム色のみ
const androidBackgroundSvg = (size = 1024) => `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F7F3EE"/>
      <stop offset="100%" stop-color="#EDE5DB"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
</svg>`;

// Android monochrome: 白足跡（テーマカラー対応）
const androidMonochromeSvg = (size = 1024) => `<svg viewBox="0 0 512 512" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(256,256) rotate(-14) translate(-256,-256)" opacity="0.35">
    <path d="M186,290 C172,295 164,313 165,334 C166,358 175,386 189,401 C200,414 214,419 224,413 C237,405 242,385 239,359 C236,330 224,298 208,287 C200,281 190,282 186,290 Z" fill="white"/>
    <ellipse cx="174" cy="274" rx="16" ry="20" fill="white"/>
    <ellipse cx="192" cy="263" rx="14" ry="17" fill="white"/>
    <ellipse cx="211" cy="259" rx="13" ry="16" fill="white"/>
    <ellipse cx="228" cy="263" rx="11" ry="14" fill="white"/>
    <ellipse cx="243" cy="272" rx="9"  ry="12" fill="white"/>
  </g>
  <g transform="translate(256,256) rotate(14) translate(-256,-256)">
    <path d="M268,146 C254,151 246,170 247,192 C248,218 258,250 274,267 C286,280 300,285 312,279 C326,270 331,249 328,221 C325,191 312,156 295,144 C286,138 275,138 268,146 Z" fill="white" opacity="0.95"/>
    <ellipse cx="255" cy="129" rx="19" ry="23" fill="white" opacity="0.92"/>
    <ellipse cx="274" cy="117" rx="16" ry="20" fill="white" opacity="0.88"/>
    <ellipse cx="294" cy="112" rx="15" ry="18" fill="white" opacity="0.84"/>
    <ellipse cx="312" cy="117" rx="13" ry="16" fill="white" opacity="0.80"/>
    <ellipse cx="328" cy="128" rx="11" ry="14" fill="white" opacity="0.74"/>
  </g>
  <circle cx="368" cy="80" r="7" fill="white" opacity="0.35"/>
  <circle cx="396" cy="56" r="5" fill="white" opacity="0.20"/>
  <circle cx="420" cy="36" r="4" fill="white" opacity="0.12"/>
</svg>`;

// スプラッシュ: フルデザイン（背景込み・390×844）
const splashIconSvg = () => `<svg viewBox="0 0 390 844" width="1170" height="2532" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>${fontFace}</style>
    <linearGradient id="sp-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7F3EE"/>
      <stop offset="100%" stop-color="#EDE5DB"/>
    </linearGradient>
    <linearGradient id="sp-foot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C4623A"/>
      <stop offset="100%" stop-color="#A04D2C"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#sp-bg)"/>
  <!-- 左足（薄め） -->
  <g transform="translate(195,422) rotate(-14) translate(-195,-422)" opacity="0.20">
    <path d="M150,340 C136,345 128,364 129,386 C130,412 140,444 155,460 C167,473 182,477 193,471 C207,463 212,441 209,413 C206,383 193,348 176,336 C167,330 156,331 150,340 Z" fill="url(#sp-foot)"/>
    <ellipse cx="137" cy="323" rx="18" ry="22" fill="url(#sp-foot)"/>
    <ellipse cx="156" cy="311" rx="15" ry="19" fill="url(#sp-foot)"/>
    <ellipse cx="176" cy="307" rx="14" ry="18" fill="url(#sp-foot)"/>
    <ellipse cx="194" cy="311" rx="12" ry="16" fill="url(#sp-foot)"/>
    <ellipse cx="210" cy="321" rx="10" ry="13" fill="url(#sp-foot)"/>
  </g>
  <!-- 右足（メイン） -->
  <g transform="translate(195,422) rotate(14) translate(-195,-422)">
    <path d="M218,296 C204,301 196,321 197,344 C198,371 209,407 226,424 C239,438 254,443 266,437 C281,428 286,406 283,376 C280,344 266,306 248,293 C238,287 226,287 218,296 Z" fill="url(#sp-foot)" opacity="0.88"/>
    <ellipse cx="204" cy="278" rx="20" ry="25" fill="url(#sp-foot)" opacity="0.86"/>
    <ellipse cx="224" cy="265" rx="17" ry="21" fill="url(#sp-foot)" opacity="0.83"/>
    <ellipse cx="244" cy="261" rx="15" ry="19" fill="url(#sp-foot)" opacity="0.80"/>
    <ellipse cx="263" cy="265" rx="13" ry="17" fill="url(#sp-foot)" opacity="0.76"/>
    <ellipse cx="279" cy="276" rx="11" ry="14" fill="url(#sp-foot)" opacity="0.70"/>
  </g>
  <circle cx="316" cy="238" r="7" fill="#C4623A" opacity="0.18"/>
  <circle cx="342" cy="214" r="5" fill="#C4623A" opacity="0.10"/>
  <circle cx="364" cy="194" r="4" fill="#C4623A" opacity="0.06"/>
  <!-- テキスト -->
  <text x="195" y="530" text-anchor="middle" font-family="Yusei Magic" font-size="72" fill="#2C1F14" letter-spacing="10">いっぽ</text>
  <line x1="120" y1="552" x2="270" y2="552" stroke="#DDD5CC" stroke-width="1"/>
  <text x="195" y="578" text-anchor="middle" font-family="Yusei Magic" font-size="17" fill="#C4623A" letter-spacing="4">一歩ずつ、前へ。</text>
  <text x="195" y="604" text-anchor="middle" font-family="Yusei Magic" font-size="13" fill="#9B8478" letter-spacing="3">ADHD対応タスク管理</text>
</svg>`;

// ── 変換 ────────────────────────────────────────────────────

async function svgToPng(svgString, outputPath, width, height) {
  await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toFile(outputPath);
  console.log(`✓ ${outputPath.replace(ASSETS + '/', '')}`);
}

async function main() {
  console.log('アセット生成中...\n');

  await svgToPng(iconSvg(1024),              join(ASSETS, 'icon.png'),                       1024, 1024);
  await svgToPng(splashIconSvg(),            join(ASSETS, 'splash-icon.png'),                1170, 2532);
  await svgToPng(androidForegroundSvg(1024), join(ASSETS, 'android-icon-foreground.png'),    1024, 1024);
  await svgToPng(androidBackgroundSvg(1024), join(ASSETS, 'android-icon-background.png'),    1024, 1024);
  await svgToPng(androidMonochromeSvg(1024), join(ASSETS, 'android-icon-monochrome.png'),    1024, 1024);
  await svgToPng(iconSvg(196),               join(ASSETS, 'favicon.png'),                     196,  196);

  console.log('\n完了！');
}

main().catch(console.error);
