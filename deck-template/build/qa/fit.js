/* ============================================================
   fit.js — 넘침 자동 검출
   ------------------------------------------------------------
   이 파이프라인에서 가장 크게 시간을 아껴준 도구다.
   각 슬라이드에서 .slide__inner 의 마지막 자식 바닥과 .slide__foot 상단
   사이 간격을 재서, 4px 미만이면 위험으로 보고한다.

   왜 scrollHeight > clientHeight 를 쓰지 않는가:
   오버레이(.reveal__veil 등) 같은 절대배치 요소 때문에 오탐이 난다.

   PPTX는 브라우저보다 한글 줄높이가 커서 20~40px 더 빡빡하게 렌더된다.
   그러니 HTML 기준으로 gap 10px 이상 남기는 걸 목표로 한다.

   실행:
     NODE_PATH=/opt/node22/lib/node_modules node build/qa/fit.js
   ============================================================ */
const path = require('path');
const { chromium } = require('playwright');

const DECK = 'file://' + path.resolve(__dirname, '../../index.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const WARN = Number(process.env.WARN_GAP || 10);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(DECK);
  // zoom을 1로 고정하고 툴바를 숨긴다. 안 하면 측정값이 스케일된다.
  await page.addStyleTag({ content: '.deck{zoom:1 !important}.toolbar{display:none !important}' });
  await page.waitForTimeout(600);

  const rows = await page.$$eval('.slide', (els) =>
    els.map((e) => {
      const inner = e.querySelector('.slide__inner');
      const foot = e.querySelector('.slide__foot');
      if (!inner || !foot) return null; // 표지·디바이더는 푸터가 없어 건너뛴다
      const kids = [...inner.children];
      const last = kids[kids.length - 1];
      if (!last) return null;
      const gap = foot.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
      return { id: e.id, gap: Math.round(gap) };
    }).filter(Boolean)
  );

  const bad = rows.filter((r) => r.gap < 4);
  const tight = rows.filter((r) => r.gap >= 4 && r.gap < WARN);

  console.log('checked  :', rows.length, 'slides');
  console.log('OVERLAP  :', bad.length ? JSON.stringify(bad) : 'none');
  console.log('TIGHT    :', tight.length ? JSON.stringify(tight) : 'none');
  if (process.env.VERBOSE) console.log('all      :', JSON.stringify(rows));

  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
