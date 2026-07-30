/* ============================================================
   build.js — HTML 덱을 편집 가능한 PPTX로 재구성한다
   ------------------------------------------------------------
   원칙: 스크린샷을 붙이지 않는다.
   전 슬라이드를 네이티브 도형·텍스트박스로 만들어야 파워포인트에서
   글자를 클릭해 바로 고칠 수 있다. 그게 PPT로 만드는 유일한 이유다.

   실행:
     NODE_PATH=/opt/node22/lib/node_modules node build/build.js
     → build/out/deck.pptx

   좌표계:
     PowerPoint 와이드 = 13.333 x 7.5 inch = 1280 x 720 px @96dpi.
     HTML 슬라이드를 1280x720 / padding 72px 로 고정해두면
     CSS에서 잡은 위치를 그대로 inch로 옮길 수 있다. (1px = 9525 EMU)
   ============================================================ */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

/* ---------- 좌표 상수 ---------- */
const IN = 1 / 96;                    // px → inch
const px = (n) => n * IN;
const SLIDE_W = 13.333, SLIDE_H = 7.5;
const PAD = px(72);                   // 0.75 - 슬라이드 안쪽 여백 = CSS --pad
const CW = SLIDE_W - PAD * 2;         // 콘텐츠 폭

/* ---------- 디자인 토큰 ----------
   deck.css의 :root 값과 같은 값을 유지한다.
   pptxgenjs는 '#' 없는 6자리 hex를 쓴다. CSS는 '#'를 붙인다. 이거 헷갈려서
   색이 안 나오는 일이 흔하다.                                        */
const C = {
  blue: "0057FF", blueFill: "1E9BE6", blueOnDark: "2997FF",
  blueWash: "EAF1FF", blueWash2: "DEE8FF",
  ink: "191919", body: "3C3C3C", muted: "707070", muted2: "959595",
  hair: "E8E8E8", hairSoft: "F0F0F0",
  canvas: "FFFFFF", parchment: "F5F5F7", dark: "191919",
  red: "E5484D",
  onDarkMuted: "A6A7AC", onDarkMuted2: "8A8B90", ghost: "2B2B2E",
  // 누적 막대 세그먼트
  segA: "9FC0FF", segB: "5B8CFF", segC: "C9D8FF", segD: "0057FF",
  // 퍼널 단계
  f1: "9FC0FF", f2: "5B8CFF", f3: "2F6BFF", f4: "0057FF",
};

const FONT = "Pretendard";            // embed_fonts.py로 파일에 심는다
const FOOT = "NOVA 브랜드 커뮤니케이션 전략 · 예시";
const OUT = path.resolve(__dirname, "out/deck.pptx");

let PRES = null;

/* ============================================================
   헬퍼 — 매 장을 개별로 짜면 20장에서 무너진다. 반복 요소를 함수로 뽑는다.
   ============================================================ */

function newPres() {
  const p = new pptxgen();
  p.layout = "LAYOUT_WIDE";
  p.theme = { headFontFace: FONT, bodyFontFace: FONT };
  PRES = p;
  return p;
}

function slide(color) {
  const s = PRES.addSlide();
  s.background = { color: color || C.canvas };
  return s;
}

/* T(): 텍스트. margin:0 을 기본으로 넣는 게 중요하다.
   pptxgenjs 기본 여백이 텍스트를 미묘하게 밀어내서, 좌표를 정확히 잡아도 어긋난다. */
function T(s, str, o) {
  s.addText(str, Object.assign({ fontFace: FONT, margin: 0, valign: "top" }, o));
}

/* SH(): 도형.
   주의 - fill:{color:"transparent"} 는 파일을 깨뜨린다. 채움 없음은 {type:"none"}. */
function SH(s, type, x, y, w, h, o) {
  s.addShape(PRES.ShapeType[type], Object.assign({ x, y, w, h }, o));
}

function card(s, x, y, w, h, o) {
  o = o || {};
  SH(s, "roundRect", x, y, w, h, {
    fill: { color: o.fill || C.canvas },
    line: o.noBorder ? { type: "none" } : { color: o.borderColor || C.hair, width: o.bw || 1 },
    rectRadius: o.radius === undefined ? 0.09 : o.radius,
  });
}

/* heading(): 강조색이 섞인 여러 줄 제목.
   lines = [[{t:"글자"},{t:"강조",hl:true}], [...]]
   \n 을 쓰면 안 된다. \n 이 들어간 run 뒤에 다른 run이 오면 뒷부분이
   별도 문단으로 분리되어 다음 줄과 잘못 합쳐진다. 줄바꿈은 breakLine으로. */
function heading(s, x, y, w, h, lines, o) {
  o = o || {};
  const size = o.size || 24;
  const runs = [];
  lines.forEach((line, li) =>
    line.forEach((r, ri) => {
      const last = ri === line.length - 1;
      const opt = {
        color: r.hl ? (o.dark ? C.blueOnDark : C.blue) : (o.dark ? "FFFFFF" : C.ink),
        bold: true,
      };
      if (last && li < lines.length - 1) opt.breakLine = true;
      runs.push({ text: r.t, options: opt });
    })
  );
  T(s, runs, {
    x, y, w, h, fontSize: size, bold: true,
    lineSpacing: o.ls || size * 1.28,
    align: o.align || "left",
    valign: o.valign || "top",
  });
}

/* marker(): 눈썹 라벨 = 짧은 파란 선 + 텍스트 */
function marker(s, label, y, dark) {
  const top = y === undefined ? PAD : y;
  SH(s, "rect", PAD, top + 0.02, 0.28, 0.03, {
    fill: { color: dark ? C.blueOnDark : C.blue }, line: { type: "none" },
  });
  T(s, label, {
    x: PAD, y: top + 0.14, w: 8, h: 0.28,
    fontSize: 12.5, bold: true, color: dark ? "FFFFFF" : C.ink,
  });
}

function foot(s, no, dark) {
  const col = dark ? C.onDarkMuted2 : C.muted2;
  T(s, FOOT, { x: PAD, y: SLIDE_H - 0.4, w: 7, h: 0.26, fontSize: 8, color: col });
  if (no) {
    T(s, no, {
      x: SLIDE_W - PAD - 1.5, y: SLIDE_H - 0.4, w: 1.5, h: 0.26,
      fontSize: 8, color: col, align: "right",
    });
  }
}

/* pill(): 알약. rectRadius = h/2 로 완전한 캡슐이 된다. */
function pill(s, x, y, w, h, str, o) {
  o = o || {};
  SH(s, "roundRect", x, y, w, h, {
    fill: o.fill ? { color: o.fill } : { type: "none" },
    line: o.line ? { color: o.line, width: 1.25 } : { type: "none" },
    rectRadius: h / 2,
  });
  T(s, str, {
    x, y, w, h, fontSize: o.fs || 11, bold: o.bold !== false,
    color: o.color || C.ink, align: "center", valign: "middle",
  });
}

/* pillRow(): 알약을 자동 줄바꿈해 배치한다. 폭은 글자 수로 추정한다.
   한글은 폭이 넓어서 0.115in/자 + 여백 0.26in 이 실측에 가까웠다. */
function pillRow(s, x, y, items, o) {
  o = o || {};
  const h = o.h || 0.26, gap = o.gap || 0.08, maxW = o.maxW || 3.0;
  let cx = x, cy = y;
  items.forEach((t) => {
    const w = 0.26 + t.length * 0.115;
    if (cx + w > x + maxW) { cx = x; cy += h + gap; }
    pill(s, cx, cy, w, h, t, {
      fill: o.fill || C.canvas, line: o.line || C.hair,
      color: o.color || C.muted, fs: o.fs || 9.5, bold: false,
    });
    cx += w + gap;
  });
  return cy + h;   // 다음 블록의 y로 쓴다
}

/* bullet(): 원 + 텍스트. CSS의 .li 와 같은 모양. */
function bullet(s, x, y, w, str, o) {
  o = o || {};
  SH(s, "ellipse", x, y + 0.085, 0.055, 0.055, {
    fill: { color: o.dot || C.blue }, line: { type: "none" },
  });
  T(s, str, {
    x: x + 0.17, y, w: w - 0.17, h: o.h || 0.3,
    fontSize: o.fs || 12, color: o.color || C.body, lineSpacing: (o.fs || 12) * 1.5,
  });
}

/* imgFrame(): 이미지 자리. 실제 사진은 photo()로 교체한다.
   그림자는 시스템 전체에서 이미지 프레임 1종만 쓴다. */
function imgFrame(s, x, y, w, h, label, o) {
  o = o || {};
  SH(s, o.circle ? "ellipse" : "roundRect", x, y, w, h, {
    fill: { color: o.dark ? "26262B" : "ECEEF2" },
    line: { color: o.dark ? "303036" : C.hair, width: 1 },
    rectRadius: o.circle ? undefined : 0.09,
    shadow: { type: "outer", color: "191919", opacity: 0.24, blur: 16, offset: 5, angle: 90 },
  });
  T(s, label, {
    x: x + 0.06, y: y + 0.06, w: w - 0.12, h: h - 0.12,
    fontSize: o.fs || 10, color: o.dark ? "6C6D74" : C.muted2,
    align: "center", valign: "middle", bold: true,
  });
}

/* photo(): 실제 이미지. sizing cover 로 프레임을 채운다.
   프레임 비율과 원본 비율이 다르면 피사체가 잘린다. 넣기 전에 비율을 맞춰라. */
function photo(s, x, y, w, h, file, o) {
  o = o || {};
  s.addImage({
    path: file, x, y, w, h,
    sizing: { type: "cover", w, h },
    shadow: o.noShadow ? undefined
      : { type: "outer", color: "191919", opacity: 0.22, blur: 14, offset: 4, angle: 90 },
  });
}

/* vlabel(): 세로 축 라벨 */
function vlabel(s, str, cx, cy, len, o) {
  o = o || {};
  T(s, str, {
    x: cx - len / 2, y: cy - 0.13, w: len, h: 0.26,
    fontSize: o.fs || 9.5, bold: true, color: o.color || C.muted,
    align: "center", valign: "middle", rotate: 270,
  });
}

/* handoff(): 장 끝에서 다음 장의 질문을 던지는 한 줄.
   비용이 거의 안 드는데 파트 전체가 하나의 흐름으로 읽힌다. */
function handoff(s, y, str) {
  SH(s, "line", PAD, y, CW, 0, { line: { color: C.hair, width: 1 } });
  T(s, [
    { text: "다음", options: { color: C.blue, bold: true } },
    { text: "   " + str, options: { color: C.muted } },
  ], { x: PAD, y: y + 0.14, w: CW, h: 0.26, fontSize: 11 });
}

/* divider(): 섹션 디바이더 */
function divider(en, num, title, items) {
  const s = slide(C.dark);
  T(s, en, { x: PAD, y: PAD, w: 6, h: 0.3, fontSize: 11, bold: true, color: C.blueOnDark, charSpacing: 2 });
  T(s, num, { x: PAD - 0.12, y: 2.15, w: 5, h: 2.1, fontSize: 130, bold: true, color: C.ghost });
  T(s, title, { x: PAD, y: 4.55, w: 7.5, h: 0.7, fontSize: 30, bold: true, color: "FFFFFF" });
  T(s, en, { x: PAD, y: SLIDE_H - 0.72, w: 5, h: 0.3, fontSize: 10, color: C.onDarkMuted2 });
  T(s, items.join("\n"), {
    x: SLIDE_W - PAD - 4.6, y: SLIDE_H - 0.72 - (items.length - 1) * 0.26, w: 4.6, h: items.length * 0.28,
    fontSize: 10, color: C.onDarkMuted2, align: "right", lineSpacing: 19,
  });
  return s;
}

/* ============================================================
   01 · 표지
   ============================================================ */
function s01() {
  const s = slide(C.dark);
  T(s, "김하늘 · 박도윤", { x: PAD, y: PAD, w: 5, h: 0.3, fontSize: 11, color: C.onDarkMuted2 });
  T(s, "NOVA · 브랜드 커뮤니케이션 전략", {
    x: SLIDE_W - PAD - 5, y: PAD, w: 5, h: 0.3,
    fontSize: 11, bold: true, color: C.blueOnDark, align: "right",
  });

  T(s, "에어핏 공기청정기 2030 커뮤니케이션 전략", {
    x: 0, y: 1.5, w: SLIDE_W, h: 0.3,
    fontSize: 12, bold: true, color: C.blueOnDark, align: "center", charSpacing: 2,
  });
  heading(s, 0, 1.92, SLIDE_W, 1.5,
    [[{ t: "오늘의 공기를," }], [{ t: "오늘 " }, { t: "바꾼다", hl: true }, { t: "." }]],
    { dark: true, size: 46, ls: 54, align: "center" });

  imgFrame(s, (SLIDE_W - 6.45) / 2, 3.72, 6.45, 2.4, "[ 제품 히어로 컷 · 실제 이미지로 교체 ]", { dark: true, fs: 11 });

  T(s, "© 2026 · 예시 문서", { x: PAD, y: SLIDE_H - 0.5, w: 4, h: 0.3, fontSize: 11, color: C.onDarkMuted2 });
  T(s, "Brand Communication Strategy", {
    x: SLIDE_W - PAD - 5, y: SLIDE_H - 0.5, w: 5, h: 0.3,
    fontSize: 11, color: C.onDarkMuted2, align: "right",
  });
}

/* ============================================================
   02 · 과제 정의 — 제목 + 리드 + 카드 2 + 전환 플로우
   ============================================================ */
function s02() {
  const s = slide(C.canvas);
  marker(s, "과제 정의");
  heading(s, PAD, PAD + 0.42, CW, 1.0,
    [[{ t: "젊은 고객의 " }, { t: "첫 번째 선택지", hl: true }, { t: "가" }], [{ t: "되기 위해." }]],
    { size: 27, ls: 34 });

  T(s, [
    { text: "에어핏은 한번 들이면 5년 이상 쓰는 제품이다. ", options: { color: C.body } },
    { text: "구매 빈도가 낮고 사용 기간이 긴 카테고리", options: { color: C.ink, bold: true } },
    { text: "이므로,", options: { color: C.body, breakLine: true } },
    { text: "첫 구매 시점에 후보군 안에 들어가 있는 것 자체가 승부를 가른다.", options: { color: C.body } },
  ], { x: PAD + 1.4, y: 2.18, w: CW - 2.8, h: 0.7, fontSize: 12.5, align: "center", lineSpacing: 19 });

  // 카드 두 장: 폭을 먼저 정하고 위치를 파생시킨다. 반대로 하면 음수 폭이 생겨 도형이 뒤집힌다.
  const gap = 0.4, cw = (CW - gap) / 2, cy = 3.05, ch = 1.45;
  card(s, PAD, cy, cw, ch, { fill: C.parchment, noBorder: true });
  T(s, "현재 과제", { x: PAD + 0.28, y: cy + 0.22, w: cw - 0.5, h: 0.3, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  T(s, "신제품과 브랜드를 2030에게 효과적으로 알리는 것.", { x: PAD + 0.28, y: cy + 0.6, w: cw - 0.56, h: 0.7, fontSize: 15, color: C.body, lineSpacing: 21 });

  const x2 = PAD + cw + gap;
  card(s, x2, cy, cw, ch, { fill: C.blueWash, borderColor: C.blue, bw: 1.5 });
  T(s, "우리의 재해석", { x: x2 + 0.28, y: cy + 0.22, w: cw - 0.5, h: 0.3, fontSize: 11, bold: true, color: C.blue, charSpacing: 1 });
  T(s, "부모님 집에서 보던 가전에서, 내가 직접 고르는 첫 가전으로 옮기는 것.", { x: x2 + 0.28, y: cy + 0.6, w: cw - 0.56, h: 0.75, fontSize: 15, color: C.ink, lineSpacing: 21 });

  // 전환 플로우: 칩 폭을 글자 수로 계산해 전체를 가운데 정렬
  const fy = 5.15;
  T(s, "커뮤니케이션 단계별 전략 제안", { x: 0, y: fy, w: SLIDE_W, h: 0.3, fontSize: 12, bold: true, color: C.ink, align: "center" });
  const steps = ["제품 노출", "브랜드 관련성", "제품 이해", "체험", "구매 고려"];
  const ws = steps.map((t) => 0.16 * t.length + 0.5);
  const arrowW = 0.4, chH = 0.5;
  const total = ws.reduce((a, b) => a + b, 0) + arrowW * (steps.length - 1);
  let cx = (SLIDE_W - total) / 2;
  steps.forEach((st, i) => {
    const on = i === steps.length - 1;
    pill(s, cx, fy + 0.42, ws[i], chH, st, {
      fill: on ? C.blue : C.canvas, line: on ? null : C.hair,
      color: on ? "FFFFFF" : C.ink, fs: 12,
    });
    cx += ws[i];
    if (i < steps.length - 1) {
      T(s, "→", { x: cx, y: fy + 0.42, w: arrowW, h: chH, fontSize: 15, color: C.muted2, align: "center", valign: "middle" });
      cx += arrowW;
    }
  });
  foot(s, "02");
}

/* ============================================================
   03 · 전략 한 장 — A/B 박스 + 결론 바
   ============================================================ */
function s03() {
  const s = slide(C.parchment);
  marker(s, "전략 수립 과정");
  heading(s, PAD, PAD + 0.4, CW, 1.05,
    [[{ t: "현재 상황을 먼저 진단하고," }], [{ t: "거기서 " }, { t: "커뮤니케이션 전략", hl: true }, { t: "을 끌어낸다." }]],
    { size: 24, ls: 32 });

  const gap = 0.5, cw = (CW - gap) / 2, cy = 2.5, ch = 2.42;
  card(s, PAD, cy, cw, ch, { fill: C.canvas });
  T(s, "1 · 브랜드 상황 진단", { x: PAD + 0.3, y: cy + 0.26, w: cw - 0.6, h: 0.26, fontSize: 11.5, bold: true, color: C.blue });
  ["카테고리 광고 카피와 동향 분석", "우리 커뮤니케이션의 현 주소", "이미 보유한 브랜드 자산 점검"]
    .forEach((l, i) => bullet(s, PAD + 0.32, cy + 0.72 + i * 0.46, cw - 0.64, l, { fs: 12 }));

  const x2 = PAD + cw + gap;
  card(s, x2, cy, cw, ch, { fill: C.canvas, borderColor: C.blue, bw: 1.5 });
  T(s, "2 · 커뮤니케이션 전략 제시", { x: x2 + 0.3, y: cy + 0.26, w: cw - 0.6, h: 0.26, fontSize: 11.5, bold: true, color: C.blue });
  SH(s, "ellipse", x2 + 0.32, cy + 0.81, 0.055, 0.055, { fill: { color: C.blue }, line: { type: "none" } });
  T(s, [
    { text: "타깃 설정과 포지셔닝", options: { color: C.body, breakLine: true } },
    { text: "→ 독립생활 2030에게 관리 부담 없는 공기 경험 제공", options: { color: C.ink, bold: true } },
  ], { x: x2 + 0.49, y: cy + 0.72, w: cw - 0.81, h: 0.7, fontSize: 12, lineSpacing: 17 });
  bullet(s, x2 + 0.32, cy + 1.52, cw - 0.64, "온라인 : 브랜드 자산을 활용한 콘텐츠 전략", { fs: 12 });
  bullet(s, x2 + 0.32, cy + 1.94, cw - 0.64, "오프라인 : 체험 중심 팝업 캠페인", { fs: 12 });

  card(s, PAD, 5.45, CW, 0.82, { fill: C.blue, borderColor: C.blue });
  T(s, "목표 : 경쟁 전략과 우리 자산을 함께 본 뒤, 2030에게 차별점이 전달되는 커뮤니케이션을 설계한다", {
    x: PAD + 0.3, y: 5.45, w: CW - 0.6, h: 0.82,
    fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle",
  });
  foot(s, "03");
}

/* ============================================================
   05 · 경쟁 카피 — 마스킹 2x2 + 공통 언어
   ============================================================ */
function s05() {
  const s = slide(C.canvas);
  marker(s, "01 · 브랜드 진단 · 01 카테고리");
  heading(s, PAD, PAD + 0.4, CW, 0.9,
    [[{ t: "브랜드마다 광고는 다르게 하지만," }], [{ t: "기억에는 " }, { t: "비슷하게", hl: true }, { t: " 남는다." }]],
    { size: 23, ls: 30 });

  const leftW = 7.4, gy = 2.62, cg = 0.24;
  const cellW = (leftW - cg) / 2, boxH = 0.78;
  const cells = [
    ["브랜드 A", "슬림한 크기와 강한 풍량, 앱 연동 맞춤 운전"],
    ["브랜드 B", "초미세먼지 제거율과 필터 교체 주기"],
    ["브랜드 C", "저소음 수면 모드, 공간별 맞춤 청정"],
    ["브랜드 D", "AI 자동 감지와 전 구간 살균 구조"],
  ];
  cells.forEach((c, i) => {
    const r = Math.floor(i / 2), col = i % 2;
    const x = PAD + col * (cellW + cg);
    const y = gy + r * (boxH + 0.36 + 0.28);
    T(s, c[0], { x, y, w: cellW, h: 0.3, fontSize: 14, bold: true, color: C.ink, align: "center" });
    card(s, x, y + 0.36, cellW, boxH, { fill: C.parchment, noBorder: true });
    T(s, c[1], { x: x + 0.2, y: y + 0.44, w: cellW - 0.4, h: boxH - 0.16, fontSize: 12.5, color: C.body, lineSpacing: 17, valign: "middle" });
  });

  const rx = PAD + leftW + 0.45, rw = SLIDE_W - PAD - rx;
  T(s, "반복되는 공통 언어", { x: rx, y: gy, w: rw, h: 0.28, fontSize: 12, bold: true, color: C.ink });
  const afterPills = pillRow(s, rx, gy + 0.4, ["제거율", "맞춤", "AI", "저소음", "필터", "살균", "풍량", "공간"], { maxW: rw });
  T(s, "모두 성능을 말한다. 소비자 입장에서는 어느 쪽이 더 나은지 판단할 근거가 남지 않는다.", {
    x: rx, y: afterPills + 0.22, w: rw, h: 0.9, fontSize: 11.5, color: C.muted, lineSpacing: 17,
  });

  pill(s, PAD, 5.86, 2.55, 0.3, "경쟁사명은 마스킹, 모델명은 삭제", { fill: C.hairSoft, color: C.muted, fs: 9.5 });
  T(s, "자료 : 각 사 공식 채널 광고 카피 · 예시 데이터", {
    x: SLIDE_W - PAD - 4.5, y: 5.9, w: 4.5, h: 0.24, fontSize: 8, color: C.muted2, align: "right",
  });
  foot(s, "05");
}

/* ============================================================
   06 · 회색 리빌 — 썸네일을 눕히고 중앙에 판단 문장
   PPTX에는 filter/backdrop 이 없다. 흰 반투명 사각형을 위에 덮어 같은 효과를 낸다.
   ============================================================ */
function s06() {
  const s = slide(C.parchment);
  marker(s, "01 · 브랜드 진단 · 02 현 주소");
  heading(s, PAD, PAD + 0.4, CW, 0.5, [[{ t: "콘텐츠는 늘었다. 그런데 하나로 기억되는가." }]], { size: 22 });

  const cols = 4, rows = 2, g = 0.16;
  const tw = (CW - g * (cols - 1)) / cols, th = tw * 10 / 16;
  const gy = 2.25;
  for (let i = 0; i < cols * rows; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    SH(s, "roundRect", PAD + c * (tw + g), gy + r * (th + g), tw, th, {
      fill: { color: "E3E4E8" }, line: { color: C.hair, width: 1 }, rectRadius: 0.09,
    });
  }
  // 베일
  SH(s, "rect", PAD - 0.12, gy - 0.14, CW + 0.24, rows * th + g + 0.28, {
    fill: { color: "F5F5F7", transparency: 22 }, line: { type: "none" },
  });

  heading(s, PAD + 1.0, 3.05, CW - 2.0, 1.0,
    [[{ t: "2030이 이 제품을 고를 이유가" }], [{ t: "하나의 브랜드 인상", hl: true }, { t: "으로 남지 않는다." }]],
    { size: 25, ls: 34, align: "center" });
  T(s, "채널마다 말이 다르면 개별 콘텐츠는 잘 돌아도 브랜드는 쌓이지 않는다.", {
    x: PAD + 1.5, y: 4.1, w: CW - 3.0, h: 0.3, fontSize: 12, color: C.muted, align: "center",
  });

  handoff(s, 5.75, "그렇다면 새로 만들기 전에, 이미 가진 것을 먼저 본다.");
  foot(s, "06");
}

/* ============================================================
   07 · 보유 자산 — 타임라인 + 자산 목록 + 이미지
   ============================================================ */
function s07() {
  const s = slide(C.canvas);
  marker(s, "01 · 브랜드 진단 · 03 보유 자산");
  heading(s, PAD, PAD + 0.4, CW, 0.5, [[{ t: "새로 만들기 전에, 이미 가진 것을 다시 묶을 수 있다." }]], { size: 22 });

  // 타임라인: 축을 먼저 깔고 노드를 균등 배치
  const ty = 2.62, nodes = [
    ["2009", "첫 캐릭터 광고 캠페인"], ["2014", "공기청정 라인 출시"],
    ["2019", "필터 정기관리 서비스"], ["2023", "디지털 콘텐츠 확대"], ["2026", "에어핏 신제품"],
  ];
  SH(s, "rect", PAD, ty + 0.34, CW, 0.02, { fill: { color: C.hair }, line: { type: "none" } });
  const step = CW / nodes.length;
  nodes.forEach((n, i) => {
    const cx = PAD + step * i + step / 2;
    T(s, n[0], { x: cx - 0.6, y: ty, w: 1.2, h: 0.24, fontSize: 11, bold: true, color: C.blue, align: "center" });
    SH(s, "ellipse", cx - 0.06, ty + 0.29, 0.12, 0.12, { fill: { color: C.blue }, line: { color: "FFFFFF", width: 2.2 } });
    T(s, n[1], { x: cx - 0.85, y: ty + 0.52, w: 1.7, h: 0.5, fontSize: 11, color: C.body, align: "center", lineSpacing: 15 });
  });

  const cy = 3.9, ch = 1.62, imgW = 3.45, cwid = CW - imgW - 0.34;
  card(s, PAD, cy, cwid, ch, { fill: C.parchment, noBorder: true });
  T(s, "지금 쓸 수 있는 자산", { x: PAD + 0.28, y: cy + 0.24, w: cwid - 0.5, h: 0.28, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  ["오래 노출된 캐릭터 자산", "정기 방문 관리 인력 네트워크", "필터 교체 이력 데이터"]
    .forEach((l, i) => bullet(s, PAD + 0.3, cy + 0.66 + i * 0.34, cwid - 0.6, l, { fs: 12 }));
  imgFrame(s, PAD + cwid + 0.34, cy, imgW, ch, "[ 과거 캠페인 스틸 ]");
  foot(s, "07");
}

/* ============================================================
   09 · 핵심 타깃 — 2x2 세그먼트 맵 + 페르소나
   사분면을 쓸 거면 축 정의 → 사분면 배치 → 라벨 순서로 반드시 검산한다.
   물려받은 장표에서 "인지 낮음"이라 쓴 칸이 축 높은 쪽에 있던 사고가 있었다.
   ============================================================ */
function s09() {
  const s = slide(C.canvas);
  marker(s, "02 · 타깃과 인사이트 · 01 핵심 타깃");
  heading(s, PAD, PAD + 0.4, CW, 0.5,
    [[{ t: "볼 사람은 ‘2030’이 아니라, " }, { t: "관리 부담이 큰 독립 생활자", hl: true }, { t: "다." }]], { size: 22 });

  // 2x2
  const mx = PAD + 0.34, my = 2.32, ms = 3.15, half = ms / 2;
  SH(s, "line", mx, my, 0, ms, { line: { color: C.ink, width: 1.75 } });
  SH(s, "line", mx, my + ms, ms, 0, { line: { color: C.ink, width: 1.75 } });
  const quads = [
    [0, 0, "관리 의지 높음\n지출 여력 낮음", "학생 · 사회초년", false],
    [1, 0, "핵심 타깃", "독립 3~5년차\n1~2인 가구", true],
    [0, 1, "관심 낮음", "가족 동거", false],
    [1, 1, "지출 여력 높음\n관리 의지 낮음", "고관여 가전 보유", false],
  ];
  quads.forEach(([c, r, k, d, hot]) => {
    const x = mx + c * half + 0.1, y = my + r * half + 0.1, w = half - 0.2, h = half - 0.2;
    if (hot) {
      SH(s, "roundRect", x, y, w, h, { fill: { color: C.blue }, line: { type: "none" }, rectRadius: 0.07,
        shadow: { type: "outer", color: "191919", opacity: 0.22, blur: 14, offset: 4, angle: 90 } });
    } else {
      SH(s, "roundRect", x, y, w, h, { fill: { type: "none" }, line: { color: C.hair, width: 1, dashType: "dash" }, rectRadius: 0.07 });
    }
    T(s, k, { x: x + 0.16, y: y + 0.16, w: w - 0.28, h: 0.52, fontSize: 10.5, bold: true, color: hot ? "FFFFFF" : C.muted, lineSpacing: 14 });
    T(s, d, { x: x + 0.16, y: y + 0.78, w: w - 0.28, h: 0.52, fontSize: 10.5, color: hot ? "FFFFFF" : C.muted, lineSpacing: 15 });
  });
  T(s, "지출 여력 →", { x: mx, y: my + ms + 0.16, w: ms, h: 0.24, fontSize: 9.5, bold: true, color: C.muted, align: "center" });
  vlabel(s, "관리 의지 →", mx - 0.22, my + ms / 2, 1.4);

  // 페르소나
  const rx = mx + ms + 0.62, rw = SLIDE_W - PAD - rx;
  card(s, rx, my - 0.02, rw, 1.62, { fill: C.parchment, noBorder: true });
  T(s, "페르소나 · 내부용 명칭 “관리 최소화형”", { x: rx + 0.28, y: my + 0.2, w: rw - 0.5, h: 0.28, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  ["27~34세 · 1~2인 가구 · 독립 3~5년", "청소·관리에 쓰는 시간을 줄이려 한다", "편의에는 돈을 쓰지만 학습은 싫어한다"]
    .forEach((l, i) => bullet(s, rx + 0.3, my + 0.62 + i * 0.34, rw - 0.6, l, { fs: 12 }));

  [["가격 민감도", "보통", 0.52], ["편의 지불 의향", "높음", 0.82]].forEach(([n, v, r], i) => {
    const gy = my + 1.9 + i * 0.62;
    T(s, n, { x: rx, y: gy, w: rw - 1.2, h: 0.24, fontSize: 11, color: C.muted });
    T(s, v, { x: rx + rw - 1.2, y: gy, w: 1.2, h: 0.24, fontSize: 11, bold: true, color: C.ink, align: "right" });
    SH(s, "roundRect", rx, gy + 0.3, rw, 0.09, { fill: { color: C.hair }, line: { type: "none" }, rectRadius: 0.045 });
    SH(s, "roundRect", rx, gy + 0.3, rw * r, 0.09, { fill: { color: C.blue }, line: { type: "none" }, rectRadius: 0.045 });
  });

  handoff(s, 5.75, "이 사람의 하루에서 어디가 막히는지 본다.");
  foot(s, "09");
}

/* ============================================================
   10 · 생활 시나리오 — 하루 타임라인 + 마찰 레드닷 + 실제 발화
   인터뷰 발화는 다듬지 말고 실제 말투로 남긴다.
   ============================================================ */
function s10() {
  const s = slide(C.canvas);
  marker(s, "02 · 타깃과 인사이트 · 02 생활 시나리오");
  heading(s, PAD, PAD + 0.4, CW, 0.5,
    [[{ t: "쓰는 데보다 " }, { t: "관리하는 데", hl: true }, { t: " 더 많은 행동이 든다." }]], { size: 22 });

  const ty = 2.6;
  SH(s, "roundRect", PAD, ty, CW, 0.05, { fill: { color: C.blueWash2 }, line: { type: "none" }, rectRadius: 0.025 });
  SH(s, "roundRect", PAD, ty, CW * 0.62, 0.05, { fill: { color: C.blue }, line: { type: "none" }, rectRadius: 0.025 });

  const stops = [
    ["07:30", "환기하고 출근", 0], ["12:00", "빈 집, 계속 가동", 1],
    ["19:00", "요리 뒤 냄새", 2], ["22:00", "소음에 껐다 켬", 1], ["주말", "필터 확인·주문", 3],
  ];
  const step = CW / stops.length;
  stops.forEach(([t, a, dots], i) => {
    const cx = PAD + step * i + step / 2;
    T(s, t, { x: cx - 0.7, y: ty + 0.2, w: 1.4, h: 0.24, fontSize: 10.5, bold: true, color: C.muted2, align: "center" });
    T(s, a, { x: cx - 0.85, y: ty + 0.46, w: 1.7, h: 0.3, fontSize: 11.5, bold: true, color: C.ink, align: "center" });
    const dw = 0.09, dg = 0.05, tot = dots * dw + (dots - 1) * dg;
    for (let d = 0; d < dots; d++) {
      SH(s, "ellipse", cx - tot / 2 + d * (dw + dg), ty + 0.8, dw, dw, { fill: { color: C.red }, line: { type: "none" } });
    }
  });

  const qy = 4.0, qh = 1.45, sideW = 3.15, qw = CW - sideW - 0.3;
  card(s, PAD, qy, qw, qh, { fill: C.canvas });
  T(s, [
    { text: "“", options: { color: C.blue, bold: true } },
    { text: "사놓고 방치했어요. 필터를 언제 갈아야 하는지 몰라서 그냥 계속 돌렸어요.", options: { color: C.ink, bold: true } },
    { text: "”", options: { color: C.blue, bold: true } },
  ], { x: PAD + 0.34, y: qy, w: qw - 0.68, h: qh, fontSize: 17, valign: "middle", lineSpacing: 26 });

  const sx = PAD + qw + 0.3;
  card(s, sx, qy, sideW, qh, { fill: C.parchment, noBorder: true });
  T(s, "마찰이 몰리는 지점", { x: sx + 0.26, y: qy + 0.24, w: sideW - 0.5, h: 0.28, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  T(s, [
    { text: "제품을 쓰는 순간에는 막히지 않는다. ", options: { color: C.muted } },
    { text: "관리 시점을 판단해야 할 때", options: { color: C.ink, bold: true } },
    { text: " 손이 멈춘다.", options: { color: C.muted } },
  ], { x: sx + 0.26, y: qy + 0.6, w: sideW - 0.52, h: 0.8, fontSize: 11.5, lineSpacing: 17 });
  foot(s, "10");
}

/* ============================================================
   11 · 경제성 — 누적 막대 3 시나리오
   막대는 아래에서 위로 쌓는다. 세그먼트 높이를 먼저 정하고 y를 역산해야
   음수 높이가 생기지 않는다.
   ============================================================ */
function s11() {
  const s = slide(C.canvas);
  marker(s, "02 · 타깃과 인사이트 · 03 경제성");
  heading(s, PAD, PAD + 0.4, CW, 0.5, [[{ t: "모두에게 싸지는 않다. 많이 쓰는 사람에게는 합칠 이유가 있다." }]], { size: 22 });

  const baseY = 5.16, maxH = 2.45, barW = 1.0, sideW = 3.35;
  const chartW = CW - sideW - 0.45;
  const cols = [
    { name: "가볍게 쓰는 경우", sub: "월 3.6만원 · 예시", ratio: 0.44, segs: [[0.4, C.segA], [0.6, C.segB]] },
    { name: "평균적으로 쓰는 경우", sub: "월 5.9만원 · 예시", ratio: 0.72, segs: [[0.3, C.segA], [0.44, C.segB], [0.26, C.segC]] },
    { name: "통합 대안", sub: "월 4.2만원 · 예시", ratio: 1.0, segs: [[1.0, C.segD]] },
  ];
  const step = chartW / cols.length;
  cols.forEach((c, i) => {
    const cx = PAD + step * i + step / 2;
    const h = maxH * c.ratio;
    let y = baseY;
    c.segs.forEach(([r, col]) => {
      const sh = h * r;
      y -= sh;
      SH(s, "rect", cx - barW / 2, y, barW, sh, { fill: { color: col }, line: { type: "none" } });
    });
    T(s, c.name, { x: cx - step / 2, y: baseY + 0.14, w: step, h: 0.26, fontSize: 12, bold: true, color: C.ink, align: "center" });
    T(s, c.sub, { x: cx - step / 2, y: baseY + 0.4, w: step, h: 0.24, fontSize: 10, color: C.muted, align: "center" });
  });

  const sx = PAD + chartW + 0.45;
  card(s, sx, 2.85, sideW, 1.32, { borderColor: C.blue, bw: 1.5 });
  T(s, "회수 기준", { x: sx + 0.26, y: 3.04, w: sideW - 0.5, h: 0.26, fontSize: 11, bold: true, color: C.blue, charSpacing: 1 });
  T(s, [
    { text: "17", options: { fontSize: 34, bold: true, color: C.ink } },
    { text: " 개월", options: { fontSize: 16, bold: true, color: C.muted } },
  ], { x: sx + 0.26, y: 3.36, w: sideW - 0.5, h: 0.5 });
  T(s, "평균 사용량 기준 손익분기 · 예시", { x: sx + 0.26, y: 3.86, w: sideW - 0.5, h: 0.24, fontSize: 10, color: C.muted });
  T(s, [
    { text: "단가는 실측값으로 교체한다. 추정치를 쓸 때는 표에 ", options: { color: C.muted } },
    { text: "가정", options: { color: C.ink, bold: true } },
    { text: "이라고 적는다.", options: { color: C.muted } },
  ], { x: sx, y: 4.32, w: sideW, h: 0.7, fontSize: 11, lineSpacing: 17 });

  // 범례
  const legend = [["기기", C.segA], ["소모품", C.segB], ["관리 비용", C.segC], ["통합 요금", C.segD]];
  let lx = PAD;
  legend.forEach(([n, col]) => {
    SH(s, "rect", lx, 5.93, 0.1, 0.1, { fill: { color: col }, line: { type: "none" } });
    T(s, n, { x: lx + 0.16, y: 5.89, w: 1.1, h: 0.24, fontSize: 10, color: C.muted });
    lx += 0.16 + 0.16 * n.length + 0.34;
  });
  T(s, "단가는 모두 예시 값 · 실측치로 교체 필요", {
    x: SLIDE_W - PAD - 4.5, y: 5.92, w: 4.5, h: 0.24, fontSize: 8, color: C.muted2, align: "right",
  });
  foot(s, "11");
}

/* ============================================================
   12 · 핵심 인사이트 — 대형 문장 + 근거 2
   ============================================================ */
function s12() {
  const s = slide(C.parchment);
  marker(s, "02 · 타깃과 인사이트 · 04 핵심 인사이트");

  heading(s, PAD, 2.05, CW - 1.6, 1.5,
    [[{ t: "좋은 습관은 의지가 아니라" }], [{ t: "판단해야 하는 순간", hl: true }, { t: "에서 무너진다." }]],
    { size: 30, ls: 40 });

  const gap = 0.34, cw = (CW - 1.9 - gap) / 2, cy = 3.85, ch = 1.28;
  card(s, PAD, cy, cw, ch, { fill: C.canvas });
  T(s, "근거 1 · 발화", { x: PAD + 0.28, y: cy + 0.24, w: cw - 0.5, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  T(s, "“언제 갈아야 하는지 몰라서 그냥 뒀어요.”", { x: PAD + 0.28, y: cy + 0.62, w: cw - 0.56, h: 0.6, fontSize: 14, color: C.body, lineSpacing: 20 });

  const x2 = PAD + cw + gap;
  card(s, x2, cy, cw, ch, { fill: C.canvas });
  T(s, "근거 2 · 조사", { x: x2 + 0.28, y: cy + 0.24, w: 1.2, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  pill(s, x2 + 1.42, cy + 0.21, 1.25, 0.28, "출처 확인 예정", { fill: C.hairSoft, color: C.muted, fs: 9 });
  T(s, "보유자 중 권장 주기를 지키는 비율은 절반 이하로 나타났다.", { x: x2 + 0.28, y: cy + 0.62, w: cw - 0.56, h: 0.6, fontSize: 14, color: C.body, lineSpacing: 20 });

  handoff(s, 5.75, "그렇다면 제품은 무슨 역할을 맡아야 하는가.");
  foot(s, "12");
}

/* ============================================================
   14 · 제품의 역할 — 중앙 허브 + 좌우 대응 표
   ============================================================ */
function s14() {
  const s = slide(C.canvas);
  marker(s, "03 · 브랜드 전략 · 01 제품의 역할");
  heading(s, PAD, PAD + 0.4, CW, 0.5,
    [[{ t: "제품이 맡을 일은 하나다. " }, { t: "관리 판단을 대신하는 것", hl: true }, { t: "." }]], { size: 22 });

  const rows = [
    ["필터 교체 시점 판단", "주기를 알려주고 자동 배송"],
    ["모드 선택", "공기 상태에 맞춰 알아서 운전"],
    ["소음 때문에 껐다 켜기", "취침 시간대 자동 저소음"],
    ["청소 주기 기억", "방문 관리 일정에 포함"],
  ];
  const hubD = 1.72, colW = (CW - hubD - 0.7) / 2;
  const rowH = 0.52, top = 2.75;
  const lx = PAD, rx = PAD + colW + hubD + 0.7;

  rows.forEach((r, i) => {
    const y = top + i * rowH;
    T(s, r[0], { x: lx, y: y + 0.06, w: colW, h: 0.3, fontSize: 13, color: C.muted, align: "right" });
    SH(s, "line", lx, y + rowH - 0.06, colW, 0, { line: { color: C.hair, width: 1 } });
    T(s, r[1], { x: rx, y: y + 0.06, w: colW, h: 0.3, fontSize: 13, bold: true, color: C.ink });
    SH(s, "line", rx, y + rowH - 0.06, colW, 0, { line: { color: C.hair, width: 1 } });
  });

  const hubX = PAD + colW + 0.35, hubY = top + (rows.length * rowH - hubD) / 2;
  SH(s, "ellipse", hubX, hubY, hubD, hubD, {
    fill: { color: C.blue }, line: { type: "none" },
    shadow: { type: "outer", color: "191919", opacity: 0.22, blur: 14, offset: 4, angle: 90 },
  });
  T(s, [
    { text: "에어핏", options: { fontSize: 17, bold: true, color: "FFFFFF", breakLine: true } },
    { text: "관리를 대신하는", options: { fontSize: 10.5, color: "E3ECFF", breakLine: true } },
    { text: "공기청정기", options: { fontSize: 10.5, color: "E3ECFF" } },
  ], { x: hubX, y: hubY, w: hubD, h: hubD, align: "center", valign: "middle", lineSpacing: 17 });

  handoff(s, 5.75, "이 역할을 전달할 자산을 어디까지 쓸 것인가.");
  foot(s, "14");
}

/* ============================================================
   15 · 자산 활용 수준 — 사다리형 의사결정
   사분면(2x2)은 축 두 개를 동시에 조합해야 해서 잘 안 읽힌다.
   한 방향으로 읽히는 단계 + 줄마다 O/X 조건 태그로 바꾸니 해결됐다.
   ============================================================ */
function s15() {
  const s = slide(C.canvas);
  marker(s, "03 · 브랜드 전략 · 02 자산 활용 수준");
  heading(s, PAD, PAD + 0.4, CW, 0.5,
    [[{ t: "기존 자산의 현재 가치를 검증해, " }, { t: "활용 수준", hl: true }, { t: "을 결정한다." }]], { size: 22 });

  const sideW = 3.1, lw = CW - sideW - 0.34;
  const rowsData = [
    ["적극", "기존 자산 전면 복원", "캠페인 중심에 놓고 전 채널에서 쓴다", [true, true], true, "유력"],
    ["기본", "새 자산으로 대체", "기억이 약하면 처음부터 만드는 편이 빠르다", [false, true], false, null],
    ["제한", "아카이브 용도로만", "브랜드 히스토리 콘텐츠에서 제한적으로", [true, false], false, null],
    ["중단", "전략에서 제외", "되살릴 근거가 없다", [false, false], false, null],
  ];
  const rh = 0.72, gy = 2.42;
  rowsData.forEach(([lv, title, desc, ox, on, pickTag], i) => {
    const y = gy + i * (rh + 0.10);
    card(s, PAD, y, lw, rh, on
      ? { fill: C.blue, borderColor: C.blue, radius: 0.06 }
      : { fill: C.canvas, borderColor: C.hair, radius: 0.06 });
    T(s, lv, { x: PAD + 0.24, y: y + 0.26, w: 0.6, h: 0.28, fontSize: 11.5, bold: true, color: on ? "FFFFFF" : C.blue });

    const titleRuns = [{ text: title, options: { fontSize: 13.5, bold: true, color: on ? "FFFFFF" : C.ink } }];
    T(s, titleRuns, { x: PAD + 0.95, y: y + 0.14, w: lw - 3.2, h: 0.28 });
    if (pickTag) pill(s, PAD + 0.95 + 0.19 * title.length + 0.14, y + 0.15, 0.68, 0.24, pickTag, { fill: "FFFFFF", color: C.blue, fs: 9 });
    T(s, desc, { x: PAD + 0.95, y: y + 0.42, w: lw - 3.2, h: 0.26, fontSize: 10.5, color: on ? "D9E4FF" : C.muted });

    // O/X 조건 태그 — 이게 있으면 축 해석이 필요 없어진다
    const labels = [["기억 " + (ox[0] ? "O" : "X"), ox[0]], ["적합 " + (ox[1] ? "O" : "X"), ox[1]]];
    let tx = PAD + lw - 0.24 - 1.66;
    labels.forEach(([t, good]) => {
      pill(s, tx, y + rh / 2 - 0.13, 0.78, 0.26, t, {
        fill: on ? (good ? "FFFFFF" : "3C74FF") : (good ? C.blueWash : C.hairSoft),
        color: on ? (good ? C.blue : "E3ECFF") : (good ? C.blue : C.muted), fs: 9.5,
      });
      tx += 0.86;
    });
  });

  const sx = PAD + lw + 0.34;
  card(s, sx, gy, sideW, 1.55, { fill: C.parchment, noBorder: true });
  T(s, "읽는 법", { x: sx + 0.26, y: gy + 0.22, w: sideW - 0.5, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  T(s, [
    { text: "위에서 아래로 한 방향으로 읽는다. 각 줄의 ", options: { color: C.muted } },
    { text: "O/X 조건", options: { color: C.ink, bold: true } },
    { text: "이 그 수준을 고르는 기준이다. 사분면처럼 축을 조합할 필요가 없다.", options: { color: C.muted } },
  ], { x: sx + 0.26, y: gy + 0.58, w: sideW - 0.52, h: 0.9, fontSize: 11, lineSpacing: 16 });
  T(s, [
    { text: "전제로 깔지 않는다. 자산은 ", options: { color: C.muted } },
    { text: "검증을 통과해야 하는 후보", options: { color: C.ink, bold: true } },
    { text: "다.", options: { color: C.muted } },
  ], { x: sx, y: gy + 1.75, w: sideW, h: 0.7, fontSize: 11, lineSpacing: 17 });

  handoff(s, 5.82, "그 O/X는 무엇으로 판정하는가.");
  foot(s, "15");
}

/* ============================================================
   16 · 검증 설계 — 눈금 있는 척도 막대 + 조사 개요 + 단계
   숫자를 그냥 놓으면 아무 의미가 없다. 조사 개요와 눈금을 반드시 같이 준다.
   척도가 1.0~5.9면 원점을 0이 아니라 1.0으로 잡아야 차이가 정직하게 보인다.
   ============================================================ */
function s16() {
  const s = slide(C.canvas);
  marker(s, "03 · 브랜드 전략 · 03 검증 설계");
  heading(s, PAD, PAD + 0.4, CW, 0.5,
    [[{ t: "설문 하나로 끝내지 않고, " }, { t: "정성 → 정량 → 행동", hl: true }, { t: " 순으로 확인한다." }]], { size: 22 });

  const MIN = 1.0, MAX = 5.9;
  const w = (v) => (v - MIN) / (MAX - MIN);      // 척도 시작점을 반영한 비율

  const sideW = 3.45, lw = CW - sideW - 0.34;
  const nameW = 1.12, valW = 0.62, trackW = lw - nameW - valW - 0.28;
  const trackX = PAD + nameW + 0.14;
  [["비보조 상기", 2.8, C.blue, C.ink], ["보조 인지", 3.7, C.blueWash2, C.muted]].forEach(([n, v, col, vc], i) => {
    const y = 2.6 + i * 0.5;
    T(s, n, { x: PAD, y: y + 0.04, w: nameW, h: 0.3, fontSize: 12, bold: true, color: C.ink });
    SH(s, "roundRect", trackX, y, trackW, 0.3, { fill: { color: C.hairSoft }, line: { type: "none" }, rectRadius: 0.05 });
    SH(s, "roundRect", trackX, y, trackW * w(v), 0.3, { fill: { color: col }, line: { type: "none" }, rectRadius: 0.05 });
    T(s, v.toFixed(1), { x: trackX + trackW + 0.14, y: y + 0.03, w: valW, h: 0.3, fontSize: 14, bold: true, color: vc, align: "right" });
  });

  // 눈금
  const ticks = [["1.0", 1.0], ["2 보통", 2.0], ["3 양호", 3.0], ["4 강함", 4.0], ["5.9", 5.9]];
  ticks.forEach(([t, v], i) => {
    const cx = trackX + trackW * w(v);
    T(s, t, {
      x: i === 0 ? trackX : cx - 0.42, y: 3.65, w: 0.84, h: 0.22, fontSize: 9, color: C.muted2,
      align: i === 0 ? "left" : i === ticks.length - 1 ? "right" : "center",
    });
  });
  T(s, "척도가 1.0에서 시작하므로 막대 원점도 1.0으로 잡는다. 0을 원점으로 두면 차이가 실제보다 커 보인다.", {
    x: PAD, y: 4.05, w: lw - 1.1, h: 0.6, fontSize: 11, color: C.muted, lineSpacing: 17,
  });
  pill(s, PAD, 4.62, 1.0, 0.28, "예시 수치", { fill: C.hairSoft, color: C.muted, fs: 9 });

  // 조사 개요 — 숫자 옆에 반드시 붙인다
  const sx = PAD + lw + 0.34;
  card(s, sx, 2.5, sideW, 2.16);
  T(s, "조사 개요", { x: sx + 0.26, y: 2.72, w: sideW - 0.5, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  [["기관", "외부 리서치 · 예시"], ["대상", "27~34세 120명 + 20~26세 60명"], ["기간", "2026.03 · 2주"], ["방식", "온라인 패널 · 비보조/보조 분리"]]
    .forEach(([k, v], i) => {
      const y = 3.08 + i * 0.36;
      T(s, k, { x: sx + 0.26, y, w: 0.55, h: 0.26, fontSize: 10.5, bold: true, color: C.muted2 });
      T(s, v, { x: sx + 0.88, y, w: sideW - 1.14, h: 0.32, fontSize: 10.5, color: C.body, lineSpacing: 14 });
    });

  // 4단계
  const steps = ["1 심층 인터뷰 8~12명", "2 온라인 정량 N=180", "3 콘셉트 A/B/C 테스트", "4 지연 회상 · 사전/사후"];
  const arrowW = 0.36, sw = (CW - arrowW * (steps.length - 1)) / steps.length;
  steps.forEach((t, i) => {
    const x = PAD + i * (sw + arrowW);
    card(s, x, 5.32, sw, 0.5, { fill: C.parchment, noBorder: true, radius: 0.06 });
    T(s, t, { x: x + 0.08, y: 5.32, w: sw - 0.16, h: 0.5, fontSize: 11, bold: true, color: C.ink, align: "center", valign: "middle" });
    if (i < steps.length - 1) {
      T(s, "→", { x: x + sw, y: 5.32, w: arrowW, h: 0.5, fontSize: 13, bold: true, color: C.blue, align: "center", valign: "middle" });
    }
  });
  foot(s, "16");
}

/* ============================================================
   17 · 캠페인 여정 — 6단계 가로 여정 + 팝업 존
   ============================================================ */
function s17() {
  const s = slide(C.canvas);
  marker(s, "04 · 캠페인 전략 · 01 구조");
  heading(s, PAD, PAD + 0.4, CW, 0.5, [[{ t: "광고 한 편으로 끝내지 않고, 발견에서 구매까지 이어붙인다." }]], { size: 22 });

  const stages = [
    ["01", "발견", "짧은 영상으로 첫 노출", "자산이 먼저 등장"],
    ["02", "공감", "관리 부담 장면 재현", "문제를 대신 말한다"],
    ["03", "이해", "기능을 행동으로 번역", "시연 역할"],
    ["04", "체험", "팝업에서 직접 사용", "현장 안내"],
    ["05", "고려", "비용 비교 콘텐츠", "계산을 도와준다"],
    ["06", "관계", "관리 알림 채널", "쓰는 동안 남는다"],
  ];
  const jy = 2.55, sw = CW / stages.length;
  stages.forEach(([no, t, d, role], i) => {
    const x = PAD + i * sw;
    SH(s, "rect", x + 0.1, jy, sw - 0.2, 0.05, { fill: { color: C.blueWash2 }, line: { type: "none" } });
    SH(s, "ellipse", x + 0.1, jy - 0.045, 0.14, 0.14, { fill: { color: C.blue }, line: { type: "none" } });
    T(s, no, { x: x + 0.1, y: jy + 0.22, w: sw - 0.2, h: 0.22, fontSize: 10, bold: true, color: C.blue });
    T(s, t, { x: x + 0.1, y: jy + 0.46, w: sw - 0.2, h: 0.28, fontSize: 14, bold: true, color: C.ink });
    T(s, d, { x: x + 0.1, y: jy + 0.78, w: sw - 0.24, h: 0.44, fontSize: 10.5, color: C.muted, lineSpacing: 14 });
    T(s, role, { x: x + 0.1, y: jy + 1.24, w: sw - 0.24, h: 0.26, fontSize: 10, bold: true, color: C.blue });
  });

  const zones = [
    ["1", "진단", "내 방 공기 상태를 측정해 보여준다"],
    ["2", "체험", "저소음 모드를 직접 듣는다"],
    ["3", "비교", "관리 비용을 나란히 본다"],
    ["4", "상담", "우리 집 조건으로 견적"],
  ];
  const zg = 0.16, zw = (CW - zg * 3) / 4, zy = 4.4, zh = 1.3;
  zones.forEach(([no, t, d], i) => {
    const x = PAD + i * (zw + zg);
    card(s, x, zy, zw, zh, { fill: C.parchment, noBorder: true });
    SH(s, "ellipse", x + 0.24, zy + 0.24, 0.32, 0.32, { fill: { color: C.blue }, line: { type: "none" } });
    T(s, no, { x: x + 0.24, y: zy + 0.24, w: 0.32, h: 0.32, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    T(s, t, { x: x + 0.24, y: zy + 0.64, w: zw - 0.48, h: 0.28, fontSize: 13.5, bold: true, color: C.ink });
    T(s, d, { x: x + 0.24, y: zy + 0.92, w: zw - 0.48, h: 0.36, fontSize: 10.5, color: C.muted, lineSpacing: 14 });
  });
  foot(s, "17");
}

/* ============================================================
   18 · 결과 검증 — 퍼널 + 측정 노트
   ============================================================ */
function s18() {
  const s = slide(C.canvas);
  marker(s, "05 · 검증과 효과 · 01 결과 검증");
  heading(s, PAD, PAD + 0.4, CW, 0.5,
    [[{ t: "조회수보다, " }, { t: "브랜드가 떠오르고 제품이 궁금해졌는지", hl: true }, { t: "를 본다." }]], { size: 21 });

  const sideW = 3.55, fw = CW - sideW - 0.5;
  const st = [
    ["브랜드 연결", "비보조 상기 · 자산 연상률", 1.0, C.f1, C.ink],
    ["제품 이해", "핵심 기능 정답률", 0.84, C.f2, "FFFFFF"],
    ["행동 변화", "상세페이지 체류 · 견적 요청", 0.68, C.f3, "FFFFFF"],
    ["관계 변화", "관리 채널 구독 유지율", 0.52, C.f4, "FFFFFF"],
  ];
  const fh = 0.72, fy0 = 2.65;
  st.forEach(([t, d, r, col, tc], i) => {
    const w = fw * r, x = PAD + (fw - w) / 2, y = fy0 + i * (fh + 0.1);
    card(s, x, y, w, fh, { fill: col, borderColor: col, radius: 0.06 });
    T(s, t, { x, y: y + 0.13, w, h: 0.28, fontSize: 13.5, bold: true, color: tc, align: "center" });
    T(s, d, { x, y: y + 0.41, w, h: 0.24, fontSize: 10.5, color: tc === C.ink ? C.muted : "E3ECFF", align: "center" });
  });

  const sx = PAD + fw + 0.5;
  card(s, sx, fy0, sideW, 1.72, { fill: C.parchment, noBorder: true });
  T(s, "측정 노트", { x: sx + 0.26, y: fy0 + 0.24, w: sideW - 0.5, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  ["캠페인 전/후 동일 문항으로 비교", "노출자와 비노출자를 나눠 본다", "행동 지표는 조회수와 분리해 기록"]
    .forEach((l, i) => bullet(s, sx + 0.28, fy0 + 0.64 + i * 0.36, sideW - 0.56, l, { fs: 11 }));
  T(s, "목표 수치는 사전 조사 결과가 나온 뒤 채운다.", { x: sx, y: fy0 + 1.94, w: sideW, h: 0.3, fontSize: 11, color: C.muted });
  pill(s, sx, fy0 + 2.26, 1.6, 0.28, "기준선 확보 후 기입", { fill: C.hairSoft, color: C.muted, fs: 9 });
  foot(s, "18");
}

/* ============================================================
   19 · 마무리 — 변화 4열 + 풀블리드 문구
   ============================================================ */
function s19() {
  const s = slide(C.dark);
  marker(s, "기대 효과", PAD, true);
  heading(s, PAD, PAD + 0.42, CW, 0.5, [[{ t: "네 가지가 바뀐다." }]], { size: 22, dark: true });

  const items = [
    ["Brand", "부모님 집 가전", "내가 처음 고르는 가전"],
    ["Product", "기능이 많은 제품", "판단을 대신하는 제품"],
    ["Communication", "채널마다 다른 말", "하나로 쌓이는 인상"],
    ["Business", "단발 구매", "관리로 이어지는 관계"],
  ];
  const g = 0.22, cw = (CW - g * 3) / 4, cy = 2.35, ch = 1.95;
  items.forEach(([k, from, to], i) => {
    const x = PAD + i * (cw + g);
    SH(s, "roundRect", x, cy, cw, ch, {
      fill: { color: "232326" }, line: { color: "323238", width: 1 }, rectRadius: 0.09,
    });
    T(s, k, { x: x + 0.24, y: cy + 0.26, w: cw - 0.48, h: 0.26, fontSize: 10.5, bold: true, color: C.blueOnDark, charSpacing: 1 });
    T(s, from, { x: x + 0.24, y: cy + 0.66, w: cw - 0.48, h: 0.26, fontSize: 11.5, color: C.onDarkMuted });
    T(s, "↓", { x: x + 0.24, y: cy + 0.94, w: cw - 0.48, h: 0.26, fontSize: 12, color: C.blueOnDark });
    T(s, to, { x: x + 0.24, y: cy + 1.24, w: cw - 0.48, h: 0.6, fontSize: 14, bold: true, color: "FFFFFF", lineSpacing: 19 });
  });

  heading(s, 0, 5.05, SLIDE_W, 0.7,
    [[{ t: "오늘의 공기를, 오늘 " }, { t: "바꾼다", hl: true }, { t: "." }]],
    { dark: true, size: 30, align: "center" });
  T(s, "김하늘 · 박도윤 · 예시 문서", {
    x: 0, y: 5.72, w: SLIDE_W, h: 0.3, fontSize: 11, color: C.onDarkMuted2, align: "center",
  });
}

/* ============================================================
   조립 — HTML의 순서와 반드시 같게 유지한다.
   한쪽만 고치면 조용히 어긋난다. 이 프로젝트에서 실제로 HTML 27장 /
   PPTX 28장 상태로 한동안 굴러간 적이 있다.
   ============================================================ */
newPres();
s01();
s02();
s03();
divider("Part 01", "01", "브랜드 진단", ["05 카테고리 커뮤니케이션", "06 우리의 현 주소", "07 보유 자산"]);
s05();
s06();
s07();
divider("Part 02", "02", "타깃과 인사이트", ["09 핵심 타깃", "10 생활 시나리오", "11 경제성", "12 핵심 인사이트"]);
s09();
s10();
s11();
s12();
divider("Part 03", "03", "브랜드 전략", ["14 제품의 역할", "15 자산 활용 수준", "16 검증 설계"]);
s14();
s15();
s16();
s17();
s18();
s19();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
PRES.writeFile({ fileName: OUT }).then(() => {
  const n = PRES.slides ? PRES.slides.length : "?";
  console.log("built:", OUT, "| slides:", n);
});
