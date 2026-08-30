/* ============================================================
   shot.js — 슬라이드 스크린샷
   ------------------------------------------------------------
   인자 없이 돌리면 전 장, id를 주면 그 장만 찍는다.
     NODE_PATH=/opt/node22/lib/node_modules node build/qa/shot.js         # 전체
     NODE_PATH=/opt/node22/lib/node_modules node build/qa/shot.js s16     # 한 장
   결과는 build/qa/out/ 에 저장된다.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DECK = process.env.DECK
  ? 'file://' + path.resolve(process.env.DECK)
  : 'file://' + path.resolve(__dirname, '../../index.html');
const OUT = path.resolve(__dirname, 'out');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const only = process.argv[2];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(DECK);
  await page.addStyleTag({ content: '.deck{zoom:1 !important}.toolbar{display:none !important}' });
  await page.waitForTimeout(600);

  const ids = only ? [only] : await page.$$eval('.slide', (els) => els.map((e) => e.id));
  for (const id of ids) {
    const el = await page.$('#' + id);
    if (!el) { console.log('missing', id); continue; }
    await el.screenshot({ path: path.join(OUT, id + '.png') });
    console.log('shot', id);
  }
  await browser.close();
})();
