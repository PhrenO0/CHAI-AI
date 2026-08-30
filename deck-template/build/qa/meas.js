/* ============================================================
   meas.js — 어느 블록이 넘치는지 측정
   ------------------------------------------------------------
   fit.js가 "이 장이 넘친다"까지 알려주면, 이걸로 "어디를 줄일지"를 본다.
   .slide__inner의 직계 자식별 높이와 margin-top을 뽑는다.

   실행:
     NODE_PATH=/opt/node22/lib/node_modules node build/qa/meas.js s16

   읽는 법:
     자식 높이 + margin 합계  vs  가용 높이(720 - padding*2 = 576)
     예) 131 + 404 + 11 + 74 = 620  →  576보다 44px 초과
   ============================================================ */
const path = require('path');
const { chromium } = require('playwright');

const DECK = process.env.DECK
  ? 'file://' + path.resolve(process.env.DECK)
  : 'file://' + path.resolve(__dirname, '../../index.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const id = process.argv[2];
if (!id) { console.error('usage: node meas.js <slideId>   e.g. s16'); process.exit(2); }

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(DECK);
  await page.addStyleTag({ content: '.deck{zoom:1 !important}.toolbar{display:none !important}' });
  await page.waitForTimeout(500);

  const r = await page.$eval('#' + id, (e) => {
    const inner = e.querySelector('.slide__inner');
    const foot = e.querySelector('.slide__foot');
    const kids = [...inner.children].map((c) => {
      const cs = getComputedStyle(c);
      return {
        cls: (c.className || c.tagName).toString().slice(0, 30),
        h: Math.round(c.getBoundingClientRect().height),
        mt: cs.marginTop,
        mb: cs.marginBottom,
      };
    });
    const last = inner.children[inner.children.length - 1];
    return {
      pad: getComputedStyle(inner).padding,
      innerH: inner.clientHeight,
      usable: inner.clientHeight - parseFloat(getComputedStyle(inner).paddingTop) * 2,
      sum: kids.reduce((a, k) => a + k.h + parseFloat(k.mt) + parseFloat(k.mb), 0),
      footGap: foot ? Math.round(foot.getBoundingClientRect().top - last.getBoundingClientRect().bottom) : null,
      kids,
    };
  });

  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
