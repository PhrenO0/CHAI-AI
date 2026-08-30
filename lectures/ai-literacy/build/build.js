/* ============================================================
   build.js — AI 교양의 이해 (18장) 를 편집 가능한 PPTX로
   ------------------------------------------------------------
   deck-template/build/build.js 의 헬퍼를 그대로 쓴다.
   좌표계·토큰은 index.html / styles/deck.css 와 같은 값을 유지한다.

   실행:
     NODE_PATH=<pptxgenjs 위치> node build/build.js
     → build/out/ai-literacy.pptx
   ============================================================ */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const IN = 1 / 96;
const px = (n) => n * IN;
const SLIDE_W = 13.333, SLIDE_H = 7.5;
const PAD = px(72);
const CW = SLIDE_W - PAD * 2;

const C = {
  blue: "0057FF", blueFill: "1E9BE6", blueOnDark: "2997FF",
  blueWash: "EAF1FF", blueWash2: "DEE8FF",
  ink: "191919", body: "3C3C3C", muted: "707070", muted2: "959595",
  hair: "E8E8E8", hairSoft: "F0F0F0",
  canvas: "FFFFFF", parchment: "F5F5F7", dark: "191919",
  red: "E5484D", amber: "FFD591",
  onDarkMuted: "A6A7AC", onDarkMuted2: "8A8B90", ghost: "2B2B2E",
};

const FONT = "Pretendard";
const FOOT = "수업용 예시 자료 · 실제 강의자료 아님";
const OUT = path.resolve(__dirname, "out/ai-literacy.pptx");

let PRES = null;

/* ---------- 헬퍼 ---------- */
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
function T(s, str, o) {
  s.addText(str, Object.assign({ fontFace: FONT, margin: 0, valign: "top" }, o));
}
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
/* breakLine 은 반드시 options 안에 넣는다. 밖에 두면 조용히 무시된다. */
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
    align: o.align || "left", valign: o.valign || "top",
  });
}
/* 이 덱은 눈썹 + 제목 + 부제가 한 세트로 반복된다. 통째로 함수화했다. */
function head(s, eyebrow, titleLines, sub, o) {
  o = o || {};
  SH(s, "rect", PAD, PAD + 0.02, 0.28, 0.03, {
    fill: { color: o.dark ? C.blueOnDark : C.blue }, line: { type: "none" },
  });
  T(s, eyebrow, {
    x: PAD, y: PAD + 0.14, w: 8, h: 0.26,
    fontSize: 11, bold: true, color: o.dark ? "FFFFFF" : C.ink, charSpacing: 1.4,
  });
  heading(s, PAD, PAD + 0.5, CW, 0.5, titleLines, { size: o.size || 22, dark: o.dark });
  if (sub) {
    T(s, sub, {
      x: PAD, y: PAD + 1.02, w: CW, h: 0.26,
      fontSize: 11.5, color: o.dark ? C.onDarkMuted : C.muted,
    });
  }
}
function foot(s, no, dark) {
  const col = dark ? C.onDarkMuted2 : C.muted2;
  T(s, FOOT, { x: PAD, y: SLIDE_H - 0.4, w: 7, h: 0.26, fontSize: 8, color: col });
  T(s, no, {
    x: SLIDE_W - PAD - 1.5, y: SLIDE_H - 0.4, w: 1.5, h: 0.26,
    fontSize: 8, color: col, align: "right",
  });
}
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
function badge(s, x, y, d, num, o) {
  o = o || {};
  SH(s, "ellipse", x, y, d, d, { fill: { color: o.fill || C.blueFill }, line: { type: "none" } });
  T(s, String(num), {
    x, y, w: d, h: d, fontSize: o.fs || 12, bold: true,
    color: "FFFFFF", align: "center", valign: "middle",
  });
}
function handoff(s, y, str) {
  SH(s, "line", PAD, y, CW, 0, { line: { color: C.hair, width: 1 } });
  T(s, [
    { text: "다음", options: { color: C.blue, bold: true } },
    { text: "   " + str, options: { color: C.muted } },
  ], { x: PAD, y: y + 0.14, w: CW, h: 0.26, fontSize: 11 });
}
/* 결론 바 — 이 덱에서 여섯 번 반복된다 */
function bar(s, y, str, o) {
  o = o || {};
  const h = o.h || 0.62;
  card(s, PAD, y, CW, h, { fill: o.fill || C.blue, borderColor: o.fill || C.blue });
  T(s, o.runs || str, {
    x: PAD + 0.3, y, w: CW - 0.6, h,
    fontSize: o.fs || 14, bold: true, color: o.color || "FFFFFF",
    align: "center", valign: "middle",
  });
}
/* 표 — 세로 괘선 없이 가로줄만 */
function table(s, x, y, w, cols, rows, o) {
  o = o || {};
  const rh = o.rh || 0.42, hh = o.hh || 0.36;
  let cx = x;
  cols.forEach((c) => {
    T(s, c.label, {
      x: cx, y, w: c.w, h: 0.26, fontSize: 10, bold: true, color: C.muted,
      align: c.align || "left", charSpacing: 0.3,
    });
    cx += c.w;
  });
  SH(s, "line", x, y + hh, w, 0, { line: { color: C.ink, width: 1.5 } });

  rows.forEach((r, ri) => {
    const ry = y + hh + ri * rh;
    cx = x;
    cols.forEach((c, ci) => {
      const cell = r[ci];
      const isObj = cell && typeof cell === "object";
      T(s, isObj ? cell.t : cell, {
        x: cx + (c.align === "right" ? 0 : 0), y: ry + 0.11, w: c.w, h: 0.28,
        fontSize: o.fs || 12,
        bold: isObj ? !!cell.bold : ci === 0,
        color: isObj ? (cell.color || C.body) : (ci === 0 ? C.ink : C.body),
        align: c.align || "left",
      });
      cx += c.w;
    });
    if (ri < rows.length - 1) {
      SH(s, "line", x, ry + rh, w, 0, { line: { color: C.hair, width: 1 } });
    }
  });
  return y + hh + rows.length * rh;
}
/* 가로 막대 목록 */
function hbars(s, x, y, w, items, o) {
  o = o || {};
  const nameW = o.nameW || 1.05, valW = o.valW || 1.15, gap = 0.16;
  const trackX = x + nameW + gap;
  const trackW = w - nameW - valW - gap * 2;
  const rh = o.rh || 0.44, bh = 0.23;
  items.forEach((it, i) => {
    const ry = y + i * rh;
    T(s, it.name, { x, y: ry + 0.02, w: nameW, h: 0.26, fontSize: 12, bold: true, color: C.ink });
    SH(s, "roundRect", trackX, ry, trackW, bh, {
      fill: { color: C.hairSoft }, line: { type: "none" }, rectRadius: 0.045,
    });
    SH(s, "roundRect", trackX, ry, trackW * it.r, bh, {
      fill: { color: it.soft ? C.blueWash2 : C.blue }, line: { type: "none" }, rectRadius: 0.045,
    });
    T(s, it.val, {
      x: trackX + trackW + gap, y: ry + 0.02, w: valW, h: 0.26,
      fontSize: 11, bold: true, color: C.muted, align: "right",
    });
  });
  return y + items.length * rh;
}

/* ============================================================
   01 · 표지
   ============================================================ */
function s01() {
  const s = slide(C.dark);
  T(s, "AI101 · LECTURE 03", { x: PAD, y: PAD, w: 5, h: 0.3, fontSize: 11, color: C.onDarkMuted2 });
  T(s, "수업용 예시 자료", {
    x: SLIDE_W - PAD - 5, y: PAD, w: 5, h: 0.3,
    fontSize: 11, bold: true, color: C.blueOnDark, align: "right", charSpacing: 1.4,
  });

  T(s, "AI 교양의 이해", { x: PAD, y: 2.55, w: 9, h: 0.95, fontSize: 50, bold: true, color: "FFFFFF" });
  T(s, "생성형 AI, 답변에서 실행으로", { x: PAD, y: 3.6, w: 9, h: 0.55, fontSize: 27, bold: true, color: C.blueOnDark });
  T(s, "대학생의 학습 · 검증 · 책임을 중심으로", { x: PAD, y: 4.3, w: 9, h: 0.35, fontSize: 15, color: C.onDarkMuted });

  T(s, "PDF → 인터랙티브 학습 페이지 변환 실험용", { x: PAD, y: SLIDE_H - 0.5, w: 6, h: 0.3, fontSize: 11, color: C.onDarkMuted2 });
  T(s, "2026.08", {
    x: SLIDE_W - PAD - 3, y: SLIDE_H - 0.5, w: 3, h: 0.3,
    fontSize: 11, color: C.onDarkMuted2, align: "right",
  });
}

/* ============================================================
   02 · 오늘의 질문
   ============================================================ */
function s02() {
  const s = slide(C.canvas);
  SH(s, "rect", PAD, PAD + 0.02, 0.28, 0.03, { fill: { color: C.blue }, line: { type: "none" } });
  T(s, "TODAY’S QUESTION", { x: PAD, y: PAD + 0.14, w: 8, h: 0.26, fontSize: 11, bold: true, color: C.ink, charSpacing: 1.4 });

  const sideW = 3.4, lw = CW - sideW - 0.6;
  heading(s, PAD, 2.35, lw, 1.3,
    [[{ t: "AI가 과제를 대신하면," }], [{ t: "나는 무엇을 배운 것일까?", hl: true }]],
    { size: 30, ls: 42 });
  T(s, "생성형 AI의 핵심은 더 빠른 답이 아니라, 무엇을 위임하고 무엇을 직접 판단할지 결정하는 능력이다.", {
    x: PAD, y: 3.85, w: lw, h: 0.7, fontSize: 13.5, color: C.body, lineSpacing: 21,
  });

  const sx = PAD + lw + 0.6;
  T(s, "수업의 관점", { x: sx, y: 2.35, w: sideW, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  [["기능보다 사용 과정", false], ["결과보다 검증 가능성", false], ["대체보다 판단 확장", true]]
    .forEach(([t, on], i) => {
      const y = 2.78 + i * 0.66;
      card(s, sx, y, sideW, 0.54, on
        ? { fill: C.blueWash, borderColor: C.blue }
        : { fill: C.parchment, noBorder: true });
      T(s, t, {
        x: sx + 0.26, y, w: sideW - 0.5, h: 0.54,
        fontSize: 13.5, bold: true, color: on ? C.blue : C.ink, valign: "middle",
      });
    });
  foot(s, "02");
}

/* ============================================================
   03 · 학습 목표
   ============================================================ */
function s03() {
  const s = slide(C.canvas);
  head(s, "LEARNING GOALS", [[{ t: "오늘의 학습 목표" }]], "수업이 끝난 뒤 스스로 설명하고 적용할 수 있어야 하는 세 가지");

  const items = [
    ["작동 원리", "생성형 AI가 확률적으로\n결과를 구성한다는 사실을 설명"],
    ["활용 판단", "검색 · 변환 · 실행 중\n과제에 적합한 사용 방식을 선택"],
    ["검증 책임", "출처 · 수치 · 추론을 구분하고\n결과의 한계를 표시"],
  ];
  const gap = 0.28, cw = (CW - gap * 2) / 3, cy = 2.35, ch = 2.4;
  items.forEach(([t, d], i) => {
    const x = PAD + i * (cw + gap);
    const on = i === 2;
    card(s, x, cy, cw, ch, on ? { borderColor: C.blue, bw: 1.5 } : {});
    badge(s, x + 0.3, cy + 0.3, 0.4, i + 1, on ? { fill: C.blue } : {});
    T(s, t, { x: x + 0.3, y: cy + 0.9, w: cw - 0.6, h: 0.4, fontSize: 20, bold: true, color: C.ink });
    T(s, d, { x: x + 0.3, y: cy + 1.42, w: cw - 0.6, h: 0.8, fontSize: 12, color: C.muted, lineSpacing: 19 });
  });

  handoff(s, 5.6, "먼저 이 시스템이 무엇을 하는 물건인지부터 본다.");
  foot(s, "03");
}

/* ============================================================
   04 · 개념 01
   ============================================================ */
function s04() {
  const s = slide(C.canvas);
  head(s, "CONCEPT 01", [[{ t: "생성형 AI란 무엇인가" }]], "학습된 패턴을 바탕으로 요청에 맞는 새로운 결과를 구성하는 시스템");

  const sideW = 3.3, lw = CW - sideW - 0.5;
  T(s, [
    { text: "“", options: { color: C.blue, bold: true } },
    { text: "그럴듯한 다음 단위를 예측해 결과를 만든다.", options: { color: C.ink, bold: true } },
    { text: "”", options: { color: C.blue, bold: true } },
  ], { x: PAD, y: 2.45, w: lw, h: 0.4, fontSize: 19 });

  T(s, "텍스트 모델은 문장을 통째로 기억해 꺼내기보다, 입력된 맥락에서 다음 토큰의 확률을 계산한다. 따라서 유창함은 사실성의 증거가 아니며, 같은 요청에서도 결과가 달라질 수 있다.", {
    x: PAD, y: 3.1, w: lw, h: 1.0, fontSize: 13, color: C.body, lineSpacing: 22,
  });

  const tags = ["확률적 생성", "맥락 의존", "결과 변동"];
  let tx = PAD;
  tags.forEach((t) => {
    const w = 0.34 + t.length * 0.125;
    pill(s, tx, 4.35, w, 0.32, t, { fill: C.canvas, line: C.hair, color: C.muted, fs: 10.5, bold: false });
    tx += w + 0.12;
  });

  const sx = PAD + lw + 0.5;
  T(s, "핵심 구분", { x: sx, y: 2.4, w: sideW, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  [["유창한 문장", "≠ 검증된 사실"], ["높은 성능", "≠ 무오류"]].forEach(([a, b], i) => {
    const y = 2.8 + i * 1.0;
    card(s, sx, y, sideW, 0.86, { fill: C.parchment, noBorder: true });
    T(s, a, { x: sx + 0.26, y: y + 0.16, w: sideW - 0.5, h: 0.28, fontSize: 13.5, bold: true, color: C.ink });
    T(s, b, { x: sx + 0.26, y: y + 0.48, w: sideW - 0.5, h: 0.28, fontSize: 13.5, bold: true, color: C.blue });
  });
  foot(s, "04");
}

/* ============================================================
   05 · 개념 02 · 네 단계
   ============================================================ */
function s05() {
  const s = slide(C.parchment);
  head(s, "CONCEPT 02", [[{ t: "결과는 " }, { t: "네 단계", hl: true }, { t: "에서 달라진다" }]],
    "프롬프트만이 아니라 맥락 · 처리 · 검증까지 하나의 작업 설계");

  const stages = [
    ["INPUT", "질문 · 목표", "무엇을 원하는가"],
    ["CONTEXT", "자료 · 제약", "무엇을 참고하는가"],
    ["PROCESS", "추론 · 도구", "어떻게 수행하는가"],
    ["CHECK", "검증 · 수정", "무엇을 믿을 것인가"],
  ];
  const jy = 2.85, sw = CW / stages.length;
  stages.forEach(([no, t, d], i) => {
    const x = PAD + i * sw;
    SH(s, "rect", x + 0.1, jy, sw - 0.24, 0.05, { fill: { color: C.blueWash2 }, line: { type: "none" } });
    SH(s, "ellipse", x + 0.1, jy - 0.045, 0.14, 0.14, { fill: { color: C.blue }, line: { type: "none" } });
    T(s, no, { x: x + 0.1, y: jy + 0.26, w: sw - 0.24, h: 0.24, fontSize: 10.5, bold: true, color: C.blue, charSpacing: 0.8 });
    T(s, t, { x: x + 0.1, y: jy + 0.54, w: sw - 0.24, h: 0.3, fontSize: 16, bold: true, color: C.ink });
    T(s, d, { x: x + 0.1, y: jy + 0.9, w: sw - 0.24, h: 0.3, fontSize: 11.5, color: C.muted });
  });

  bar(s, 5.05, "좋은 결과 = 좋은 질문 × 충분한 맥락 × 적절한 도구 × 인간의 검증", { fs: 16, h: 0.75 });
  foot(s, "05");
}

/* ============================================================
   06 · 개념 03 · 세 층위
   ============================================================ */
function s06() {
  const s = slide(C.canvas);
  head(s, "CONCEPT 03", [[{ t: "AI 활용은 " }, { t: "세 가지 층위", hl: true }, { t: "로 나뉜다" }]],
    "같은 AI라도 맡기는 일의 범위에 따라 위험과 책임이 달라짐");

  const cols = [
    ["검색", "정보를 찾고 비교", ["논문 후보 찾기", "개념 차이 설명"], "낮음", 0.28],
    ["변환", "형식을 바꾸고 재구성", ["PDF → 퀴즈", "표 → 발표 구조"], "중간", 0.58],
    ["실행", "도구를 사용해 과업 수행", ["메일 초안 작성", "웹페이지 생성"], "높음", 0.92],
  ];
  const gap = 0.26, cw = (CW - gap * 2) / 3, cy = 2.3, ch = 2.68;
  cols.forEach(([t, d, ex, lvl, r], i) => {
    const x = PAD + i * (cw + gap);
    const on = i === 2;
    card(s, x, cy, cw, ch, on ? { borderColor: C.blue, bw: 1.5 } : {});
    T(s, t, { x: x + 0.3, y: cy + 0.26, w: cw - 0.6, h: 0.4, fontSize: 22, bold: true, color: on ? C.blue : C.ink });
    T(s, d, { x: x + 0.3, y: cy + 0.74, w: cw - 0.6, h: 0.28, fontSize: 12, color: C.muted });
    ex.forEach((e, j) => bullet(s, x + 0.3, cy + 1.12 + j * 0.36, cw - 0.6, e, { fs: 12 }));

    const gy = cy + ch - 0.72;
    T(s, "검증 부담", { x: x + 0.3, y: gy, w: cw - 1.2, h: 0.24, fontSize: 10.5, color: C.muted });
    T(s, lvl, {
      x: x + cw - 1.1, y: gy, w: 0.8, h: 0.24,
      fontSize: 10.5, bold: true, color: on ? C.blue : C.ink, align: "right",
    });
    SH(s, "roundRect", x + 0.3, gy + 0.3, cw - 0.6, 0.11, { fill: { color: C.hair }, line: { type: "none" }, rectRadius: 0.055 });
    SH(s, "roundRect", x + 0.3, gy + 0.3, (cw - 0.6) * r, 0.11, { fill: { color: C.blue }, line: { type: "none" }, rectRadius: 0.055 });
  });

  handoff(s, 5.6, "맡기는 범위가 넓어지면 도구의 성격 자체가 달라진다.");
  foot(s, "06");
}

/* ============================================================
   07 · 전환 · 답변형 → 실행형
   ============================================================ */
function s07() {
  const s = slide(C.canvas);
  head(s, "SHIFT", [[{ t: "답변형 AI에서 " }, { t: "실행형 AI", hl: true }, { t: "로" }]],
    "사용자의 요청을 계획하고 여러 단계를 연결하는 에이전트형 작업");

  const arrowW = 0.66, cw = (CW - arrowW) / 2, cy = 2.42, ch = 2.15;
  card(s, PAD, cy, cw, ch, { fill: C.parchment, noBorder: true });
  T(s, "ASSISTANT", { x: PAD + 0.34, y: cy + 0.3, w: cw - 0.68, h: 0.26, fontSize: 10.5, bold: true, color: C.muted, charSpacing: 1.2 });
  T(s, "질문 → 답변", { x: PAD + 0.34, y: cy + 0.64, w: cw - 0.68, h: 0.4, fontSize: 21, bold: true, color: C.ink });
  ["한 번의 요청과 한 번의 응답", "최종 실행은 사용자가 수행"]
    .forEach((t, i) => bullet(s, PAD + 0.34, cy + 1.22 + i * 0.38, cw - 0.68, t, { fs: 12.5 }));

  T(s, "→", { x: PAD + cw, y: cy, w: arrowW, h: ch, fontSize: 24, bold: true, color: C.blue, align: "center", valign: "middle" });

  const x2 = PAD + cw + arrowW;
  card(s, x2, cy, cw, ch, { fill: C.ink, borderColor: C.ink });
  T(s, "AGENT", { x: x2 + 0.34, y: cy + 0.3, w: cw - 0.68, h: 0.26, fontSize: 10.5, bold: true, color: C.blueOnDark, charSpacing: 1.2 });
  T(s, "목표 → 계획 → 실행", { x: x2 + 0.34, y: cy + 0.64, w: cw - 0.68, h: 0.4, fontSize: 21, bold: true, color: "FFFFFF" });
  ["도구 사용과 여러 단계 연결", "실패 시 경로 수정과 재시도"]
    .forEach((t, i) => bullet(s, x2 + 0.34, cy + 1.22 + i * 0.38, cw - 0.68, t, { fs: 12.5, dot: C.blueOnDark, color: "D6D7DB" }));

  bar(s, 5.15, "실행 범위가 넓을수록 권한 · 기록 · 검수 설계가 더 중요", { fill: C.blueWash, color: C.blue, fs: 14 });
  foot(s, "07");
}

/* ============================================================
   08 · 사례
   ============================================================ */
function s08() {
  const s = slide(C.canvas);
  head(s, "CASE STUDY", [[{ t: "사례: Gemini 3.7 Flash" }]],
    "Google이 코딩과 에이전트 작업을 위한 ‘workhorse model’로 소개한 모델");

  const sideW = 4.1, lw = CW - sideW - 0.5;
  T(s, "핵심 변화는 ‘속도’보다 작업 범위", { x: PAD, y: 2.4, w: lw, h: 0.28, fontSize: 12, bold: true, color: C.blue });
  ["복수 단계 계획과 도구 호출에 더 많은 연산 배분",
   "막힘에 적응하고 사용자의 의도를 다시 확인",
   "초기 결과의 완성도를 높여 수동 재시도 감소 지향"]
    .forEach((t, i) => bullet(s, PAD, 2.86 + i * 0.46, lw, t, { fs: 13 }));
  T(s, "발표일 2026.08.13 · Google 공식 블로그 기준", { x: PAD, y: 4.44, w: lw, h: 0.28, fontSize: 11, color: C.muted });

  const sx = PAD + lw + 0.5;
  T(s, "공식 데모의 작업", { x: sx, y: 2.4, w: sideW, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  ["텍스트 → 3D 게임", "프롬프트 → 랜딩페이지", "PDF → 데이터 스토리", "멀티에이전트 로봇 작업"]
    .forEach((t, i) => {
      const y = 2.8 + i * 0.62;
      card(s, sx, y, sideW, 0.5, { fill: C.parchment, noBorder: true });
      T(s, t, { x: sx + 0.26, y, w: sideW - 0.5, h: 0.5, fontSize: 13, bold: true, color: C.ink, valign: "middle" });
    });
  foot(s, "08");
}

/* ============================================================
   09 · 수치
   서로 다른 단위를 한 표에 놓을 때는 합산 불가라는 주의를 반드시 붙인다.
   ============================================================ */
function s09() {
  const s = slide(C.canvas);
  head(s, "DATA", [[{ t: "수치로 읽는 변화" }]], "서로 다른 벤치마크는 각각의 단위 안에서만 비교해야 함");

  const cols = [
    { label: "평가 항목", w: CW - 5.4 },
    { label: "3.6 Flash", w: 1.8, align: "right" },
    { label: "3.7 Flash", w: 1.8, align: "right" },
    { label: "변화", w: 1.8, align: "right" },
  ];
  const rows = [
    ["FrontierCode 1.1 Main", "34.4%", "43.6%", { t: "+9.2%p", bold: true, color: C.blue }],
    ["DeepSWE v1.1", "49.0%", "65.3%", { t: "+16.3%p", bold: true, color: C.blue }],
    ["WebDev Arena", "1538 Elo", "1588 Elo", { t: "+50 Elo", bold: true, color: C.blue }],
    ["GDP.pdf", "22.0%", "34.0%", { t: "+12.0%p", bold: true, color: C.blue }],
    ["AutomationBench", "17.0%", "30.4%", { t: "+13.4%p", bold: true, color: C.blue }],
  ];
  table(s, PAD, 2.42, CW, cols, rows, { rh: 0.46, fs: 13 });

  pill(s, PAD, 5.6, 5.5, 0.32, "주의 : 정확도(%)와 Elo는 단위가 달라 합산이 불가능하다", { fill: C.hairSoft, color: C.muted, fs: 9.5 });
  T(s, "출처 : Google, 2026.08.13", {
    x: SLIDE_W - PAD - 4, y: 5.64, w: 4, h: 0.24, fontSize: 8, color: C.muted2, align: "right",
  });
  foot(s, "09");
}

/* ============================================================
   10 · 비판적 읽기
   ============================================================ */
function s10() {
  const s = slide(C.parchment);
  head(s, "CRITICAL READING", [[{ t: "벤치마크가 말해주지 않는 것" }]],
    "점수 상승은 사용자의 모든 과제에서 같은 폭의 향상을 보장하지 않음");

  const items = [
    ["대표성", "시험 문제가 실제 대학 과제와 얼마나 닮았는가"],
    ["재현성", "같은 조건에서 결과가 반복되는가"],
    ["비용", "좋은 결과를 얻기 위한 시간 · 토큰 · 수정 횟수"],
    ["책임", "틀린 결과가 실행됐을 때 누가 발견하고 수정하는가"],
  ];
  const gx = 0.3, gy = 0.22, cw = (CW - gx) / 2, ch = 1.12, top = 2.4;
  items.forEach(([t, d], i) => {
    const r = Math.floor(i / 2), c = i % 2;
    const x = PAD + c * (cw + gx), y = top + r * (ch + gy);
    card(s, x, y, cw, ch);
    T(s, t, { x: x + 0.3, y: y + 0.24, w: cw - 0.6, h: 0.34, fontSize: 18, bold: true, color: C.ink });
    T(s, d, { x: x + 0.3, y: y + 0.66, w: cw - 0.6, h: 0.3, fontSize: 12, color: C.muted });
  });

  bar(s, 5.15, null, {
    fill: C.ink, h: 0.7, fs: 15,
    runs: [
      { text: "좋은 질문 : ‘몇 점 올랐나?’보다 ", options: { color: "FFFFFF", bold: true } },
      { text: "‘내 과제에서 어떤 실패가 줄었나?’", options: { color: C.blueOnDark, bold: true } },
    ],
  });
  foot(s, "10");
}

/* ============================================================
   11 · 적용
   ============================================================ */
function s11() {
  const s = slide(C.canvas);
  head(s, "APPLICATION", [[{ t: "대학생 과제에 적용한다면" }]], "AI를 쓰는 목적보다 검증 가능한 산출물을 먼저 정의");

  const cols = [
    { label: "상황", w: 2.0 },
    { label: "변환", w: CW - 2.0 - 4.0 },
    { label: "검증", w: 4.0 },
  ];
  const rows = [
    ["강의자료", "PDF → 핵심 개념 지도", { t: "페이지별 근거 표시", bold: true, color: C.blue }],
    ["시험 준비", "개념 → 오답 중심 퀴즈", { t: "정답 · 해설 원문 대조", bold: true, color: C.blue }],
    ["팀 프로젝트", "조사자료 → 데이터 스토리", { t: "수치 · 단위 · 출처 검수", bold: true, color: C.blue }],
    ["취업 준비", "경험 → 직무별 증거 정리", { t: "과장 · 허위 경험 제거", bold: true, color: C.blue }],
  ];
  table(s, PAD, 2.5, CW, cols, rows, { rh: 0.56, fs: 13.5 });

  handoff(s, 5.6, "그 검증을 무엇으로 판단할지, 수업용 데이터로 확인한다.");
  foot(s, "11");
}

/* ============================================================
   12 · 가상 설문 · 주 사용 목적
   원본에서 가상 데이터로 명시된 값이다. 표시를 지우지 않는다.
   ============================================================ */
function s12() {
  const s = slide(C.canvas);
  head(s, "SYNTHETIC DATA", [[{ t: "수업용 가상 설문 · " }, { t: "주 사용 목적", hl: true }]],
    "AI101 수강생 120명을 가정한 콘텐츠 변환 실습용 데이터");

  const sideW = 4.15, lw = CW - sideW - 0.5;
  hbars(s, PAD, 2.5, lw, [
    { name: "과제 요약", r: 1.0, val: "38명" },
    { name: "시험 복습", r: 0.79, val: "30명" },
    { name: "아이디어", r: 0.58, val: "22명", soft: true },
    { name: "취업 문서", r: 0.47, val: "18명", soft: true },
    { name: "코딩", r: 0.32, val: "12명", soft: true },
  ], { rh: 0.46 });

  const sx = PAD + lw + 0.5;
  table(s, sx, 2.42, sideW, [
    { label: "목적", w: 1.75 },
    { label: "응답자", w: 1.0, align: "right" },
    { label: "유용성 / 5.0", w: 1.4, align: "right" },
  ], [
    ["과제 요약", "38", { t: "4.2", bold: true, color: C.blue }],
    ["시험 복습", "30", "4.0"],
    ["아이디어", "22", "3.8"],
    ["취업 문서", "18", "3.6"],
    ["코딩", "12", "3.7"],
  ], { rh: 0.42, fs: 12 });

  bar(s, 5.02, "과제 요약과 시험 복습이 68명 · 응답의 절반을 넘는다. 쓰임은 이미 ‘요약과 정리’에 몰려 있다", {
    fill: C.blueWash, color: C.blue, fs: 13.5, h: 0.56,
  });
  pill(s, PAD, 5.78, 4.7, 0.3, "실제 조사 결과가 아닌 수업 · 콘텐츠 제작용 가상 데이터", { fill: C.hairSoft, color: C.muted, fs: 9 });
  T(s, "n = 120 (가정)", {
    x: SLIDE_W - PAD - 3, y: 5.82, w: 3, h: 0.24, fontSize: 8, color: C.muted2, align: "right",
  });
  foot(s, "12");
}

/* ============================================================
   13 · 가상 설문 · 검증 습관
   ============================================================ */
function s13() {
  const s = slide(C.canvas);
  head(s, "SYNTHETIC DATA", [[{ t: "수업용 가상 설문 · " }, { t: "검증 습관", hl: true }]],
    "AI 답변의 출처나 수치를 얼마나 자주 다시 확인하는가");

  hbars(s, PAD, 2.55, CW, [
    { name: "항상", r: 0.63, val: "24명 · 20.0%" },
    { name: "자주", r: 1.0, val: "38명 · 31.7%" },
    { name: "가끔", r: 0.95, val: "36명 · 30.0%", soft: true },
    { name: "거의 안 함", r: 0.47, val: "18명 · 15.0%", soft: true },
    { name: "전혀 안 함", r: 0.11, val: "4명 · 3.3%", soft: true },
  ], { rh: 0.5, nameW: 1.3, valW: 1.5 });

  const sideW = 3.3, lw = CW - sideW - 0.3;
  card(s, PAD, 5.2, lw, 0.72, { fill: C.blue, borderColor: C.blue });
  T(s, "‘가끔 이하’ 58명 : 사용 확대와 검증 습관은 별개의 문제", {
    x: PAD + 0.34, y: 5.2, w: lw - 0.68, h: 0.72,
    fontSize: 15, bold: true, color: "FFFFFF", valign: "middle",
  });
  card(s, PAD + lw + 0.3, 5.2, sideW, 0.72, { fill: C.parchment, noBorder: true });
  T(s, "실제 조사가 아닌 가상 데이터", {
    x: PAD + lw + 0.56, y: 5.2, w: sideW - 0.52, h: 0.72,
    fontSize: 11, bold: true, color: C.muted, valign: "middle",
  });
  foot(s, "13");
}

/* ============================================================
   14 · 4단계 검증 프로토콜
   ============================================================ */
function s14() {
  const s = slide(C.canvas);
  head(s, "PRACTICE", [[{ t: "4단계 검증 프로토콜" }]],
    "AI가 낸 답을 ‘그럴듯한 초안’에서 ‘사용 가능한 결과’로 바꾸는 절차");

  const items = [
    ["분리", "사실 · 추론 · 의견을 구분"],
    ["추적", "수치와 인용의 원문 위치 확인"],
    ["반증", "반례와 누락된 조건 탐색"],
    ["기록", "수정 내용과 최종 책임자 표시"],
  ];
  const gap = 0.2, cw = (CW - gap * 3) / 4, cy = 2.42, ch = 2.05;
  items.forEach(([t, d], i) => {
    const x = PAD + i * (cw + gap);
    const on = i === 3;
    card(s, x, cy, cw, ch, on ? { borderColor: C.blue, bw: 1.5 } : {});
    badge(s, x + 0.28, cy + 0.28, 0.38, i + 1, on ? { fill: C.blue } : {});
    T(s, t, { x: x + 0.28, y: cy + 0.84, w: cw - 0.56, h: 0.38, fontSize: 19, bold: true, color: C.ink });
    T(s, d, { x: x + 0.28, y: cy + 1.3, w: cw - 0.56, h: 0.6, fontSize: 12, color: C.muted, lineSpacing: 18 });
  });

  bar(s, 5.1, "검증은 AI의 반대가 아니라, AI를 실제 작업에 포함시키기 위한 조건", {
    fill: C.blueWash, color: C.blue, fs: 14,
  });
  foot(s, "14");
}

/* ============================================================
   15 · 실습 과제
   ============================================================ */
function s15() {
  const s = slide(C.canvas);
  head(s, "LAB", [[{ t: "실습: 강의자료를 학습 페이지로 변환" }]], "이 PDF 자체를 입력 자료로 사용해 결과물을 설계");

  const sideW = 4.1, lw = CW - sideW - 0.5, cy = 2.5, ch = 2.3;
  card(s, PAD, cy, lw, ch, { fill: C.parchment, noBorder: true });
  T(s, "과업", { x: PAD + 0.32, y: cy + 0.26, w: lw - 0.6, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  ["18장 강의자료의 개념 구조를 한 화면에 시각화",
   "벤치마크와 가상 설문을 각각 별도 차트로 구성",
   "모든 수치에 원문 슬라이드 번호를 연결",
   "5문항 퀴즈와 오답 해설을 추가"]
    .forEach((t, i) => bullet(s, PAD + 0.34, cy + 0.7 + i * 0.4, lw - 0.68, t, { fs: 12.5 }));

  const sx = PAD + lw + 0.5;
  T(s, "완성 조건", { x: sx, y: cy, w: sideW, h: 0.26, fontSize: 11, bold: true, color: C.muted, charSpacing: 1 });
  ["출처 슬라이드 표시", "실제 / 가상 데이터 구분", "모바일 화면 작동 확인"].forEach((t, i) => {
    const y = cy + 0.5 + i * 0.6;
    badge(s, sx, y, 0.38, i + 1, i === 2 ? { fill: C.blue } : {});
    T(s, t, { x: sx + 0.56, y: y + 0.04, w: sideW - 0.56, h: 0.3, fontSize: 13.5, bold: true, color: C.ink });
  });
  foot(s, "15");
}

/* ============================================================
   16 · 토론
   ============================================================ */
function s16() {
  const s = slide(C.parchment);
  head(s, "DISCUSSION", [[{ t: "토론: 어디까지 맡길 것인가" }]], "효율이 커질수록 위임의 기준을 더 구체적으로 정해야 함");

  const items = [
    ["정확성", "출처가 맞지만 해석이 틀렸다면?"],
    ["저작권", "강의자료를 변환해 공유해도 되는가?"],
    ["개인정보", "팀원 인터뷰를 동의 없이 입력한다면?"],
    ["저자성", "AI가 만든 구조를 내 과제로 제출한다면?"],
  ];
  const gap = 0.2, cw = (CW - gap * 3) / 4, cy = 2.5, ch = 1.6;
  items.forEach(([k, q], i) => {
    const x = PAD + i * (cw + gap);
    card(s, x, cy, cw, ch);
    T(s, k, { x: x + 0.28, y: cy + 0.28, w: cw - 0.56, h: 0.26, fontSize: 11, bold: true, color: C.blue, charSpacing: 1 });
    T(s, q, { x: x + 0.28, y: cy + 0.68, w: cw - 0.56, h: 0.7, fontSize: 13, color: C.body, lineSpacing: 19 });
  });

  heading(s, 0, 5.05, SLIDE_W, 0.6,
    [[{ t: "“할 수 있는가”와 " }, { t: "“해도 되는가”", hl: true }, { t: "는 다른 질문이다." }]],
    { size: 24, align: "center" });
  foot(s, "16");
}

/* ============================================================
   17 · 미니 퀴즈
   ============================================================ */
function s17() {
  const s = slide(C.canvas);
  head(s, "CHECK", [[{ t: "미니 퀴즈" }]], "각 문항을 누르면 정답과 근거 슬라이드가 표시되는 형태로 변환");

  const qs = [
    [{ text: "유창한 답변은 사실성을 보장한다. ", options: { color: C.ink } },
     { text: "O / X", options: { color: C.blue, bold: true } }],
    "검색 · 변환 · 실행 중 검증 부담이 가장 큰 층위는?",
    "서로 다른 벤치마크 점수를 평균 내면 안 되는 이유는?",
    "검증 프로토콜의 ‘반증’ 단계에서 해야 할 일은?",
    "가상 설문과 실제 조사 결과를 구분해야 하는 이유는?",
  ];
  const rh = 0.56, top = 2.42;
  qs.forEach((q, i) => {
    const y = top + i * (rh + 0.1);
    card(s, PAD, y, CW, rh);
    badge(s, PAD + 0.26, y + (rh - 0.34) / 2, 0.34, i + 1, {});
    T(s, typeof q === "string" ? q : q, {
      x: PAD + 0.76, y, w: CW - 1.1, h: rh,
      fontSize: 13.5, color: C.ink, valign: "middle",
    });
  });

  T(s, "정답은 변환 페이지에서 확인", { x: PAD, y: 5.72, w: 5, h: 0.26, fontSize: 11, color: C.muted });
  T(s, "근거 슬라이드 : 04 · 06 · 09 · 14 · 12~13", {
    x: SLIDE_W - PAD - 5, y: 5.76, w: 5, h: 0.24, fontSize: 8, color: C.muted2, align: "right",
  });
  foot(s, "17");
}

/* ============================================================
   18 · 마무리 · 과제와 출처
   ============================================================ */
function s18() {
  const s = slide(C.dark);
  head(s, "WRAP-UP", [[{ t: "과제 및 출처" }]],
    "학습 페이지를 만든 뒤, 정확성보다 먼저 실패 가능성을 기록", { dark: true });

  const sideW = 5.6, lw = CW - sideW - 0.6;
  T(s, "제출물", { x: PAD, y: 2.5, w: lw, h: 0.26, fontSize: 11, bold: true, color: C.blueOnDark, charSpacing: 1 });
  ["인터랙티브 학습 페이지 1개", "원문과 다른 내용 수정 기록 3개", "AI에 맡기지 않은 판단 1개"]
    .forEach((t, i) => bullet(s, PAD, 2.94 + i * 0.44, lw, t, { fs: 13, dot: C.blueOnDark, color: "D6D7DB" }));

  const sx = PAD + lw + 0.6;
  T(s, "SOURCE", { x: sx, y: 2.5, w: sideW, h: 0.26, fontSize: 11, bold: true, color: C.blueOnDark, charSpacing: 1 });
  T(s, [
    { text: "Google. (2026.08.13). Introducing Gemini 3.7 Flash.", options: { color: C.onDarkMuted, breakLine: true } },
    { text: "blog.google/innovation-and-ai/models-and-research/", options: { color: C.onDarkMuted, breakLine: true } },
    { text: "gemini-models/introducing-gemini-3-7-flash/", options: { color: C.onDarkMuted } },
  ], { x: sx, y: 2.92, w: sideW, h: 0.9, fontSize: 11, lineSpacing: 18 });
  T(s, "9쪽 벤치마크 수치와 8쪽 사례 설명의 출처", { x: sx, y: 3.92, w: sideW, h: 0.26, fontSize: 10.5, color: C.onDarkMuted2 });

  card(s, PAD, 5.0, CW, 0.72, { fill: "232326", borderColor: "323238" });
  T(s, "12~13쪽의 n=120 데이터는 콘텐츠 실험용 가상 데이터이며 실제 조사로 인용할 수 없음", {
    x: PAD + 0.3, y: 5.0, w: CW - 0.6, h: 0.72,
    fontSize: 13, bold: true, color: C.amber, align: "center", valign: "middle",
  });
  foot(s, "18", true);
}

/* ---------- 조립 · index.html과 순서를 반드시 같게 ---------- */
newPres();
[s01, s02, s03, s04, s05, s06, s07, s08, s09,
 s10, s11, s12, s13, s14, s15, s16, s17, s18].forEach((f) => f());

fs.mkdirSync(path.dirname(OUT), { recursive: true });
PRES.writeFile({ fileName: OUT }).then(() => {
  console.log("built:", OUT, "| slides:", PRES.slides.length);
});
