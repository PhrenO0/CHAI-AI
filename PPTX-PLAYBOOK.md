# 편집 가능한 한글 PPTX 만들기 — 실전 노하우

이 저장소에서 29장짜리 브랜드 전략 덱을 만들면서 쌓인 것들을 정리했다.
핵심 전제는 하나다. **스크린샷을 붙이지 않는다.** 파워포인트에서 텍스트를 클릭해 고칠 수 있어야 PPT를 만든 의미가 있다.

---

## 1. 전체 구조

```
index.html + styles/deck.css     ← 원본(source of truth). 브라우저에서 편집·검수
        │
        │  같은 좌표계·같은 토큰
        ▼
scratchpad/pptx-build/build2.js  ← pptxgenjs 빌더. 네이티브 도형/텍스트로 재구성
        │
        ▼
embed_fonts.py                   ← Pretendard를 파일에 임베드 (OOXML 직접 수정)
        │
        ▼
청호나이스-브랜드전략-제안.pptx    ← 산출물
```

HTML을 원본으로 두는 이유:

- CSS로 레이아웃을 잡으면 반복 수정이 훨씬 빠르다
- Playwright로 **넘침을 자동 검출**할 수 있다 (PPTX는 이게 안 된다)
- 웹 배포(GitHub Pages)와 PPTX를 한 소스에서 뽑는다

대가도 있다. **HTML과 빌더를 항상 두 번 고쳐야 한다.** 한쪽만 고치면 조용히 어긋난다.
실제로 이 프로젝트에서 HTML은 27장, PPTX는 28장인 상태로 한동안 굴러갔다.

---

## 2. 좌표계 — 1280×720을 그대로 쓴다

가장 중요한 결정. 파워포인트 와이드스크린은 **13.333 × 7.5 inch**이고, 이건 **1280 × 720 px @ 96dpi**와 정확히 같다.

```js
const IN = 1 / 96;
const px = (n) => n * IN;          // px → inch
const SLIDE_W = 13.333, SLIDE_H = 7.5;
const PAD = 0.72;                  // = 72px, 슬라이드 여백
const CW = SLIDE_W - PAD * 2;      // 콘텐츠 폭 11.893
```

HTML 슬라이드를 `width:1280px; height:720px; padding:72px`로 고정해두면
CSS에서 잡은 위치를 그대로 inch로 환산해 옮길 수 있다. 1px = 9525 EMU도 딱 맞는다.

**교훈**: 처음부터 이 숫자로 시작하라. 나중에 환산하려면 전부 다시 계산해야 한다.

---

## 3. 디자인 토큰을 양쪽에 복제

CSS 변수와 JS 상수를 같은 값으로 유지한다.

```js
const C = {
  blue: "0057FF",       // 단일 강조색. 이거 하나만 쓴다
  blueFill: "1E9BE6",   // 배지·서클 채움
  blueOnDark: "2997FF", // 다크 배경 위
  blueWash: "EAF1FF",   // 옅은 배경
  ink: "191919", body: "3C3C3C", muted: "707070", muted2: "959595",
  hair: "E8E8E8", hairSoft: "F0F0F0",
  canvas: "FFFFFF", parchment: "F5F5F7", dark: "191919",
  red: "E5484D",
};
```

pptxgenjs는 `#` 없는 6자리 hex를 쓴다. CSS는 `#`를 붙인다. 이거 헷갈려서 색이 안 나오는 일이 흔하다.

**강조색은 하나로 제한하는 게 제일 효과가 컸다.** 파란색 하나만 쓰면 어디가 중요한지 저절로 드러난다.

---

## 4. 헬퍼 함수로 컴포넌트화

매 장을 개별로 짜면 29장에서 무너진다. 반복 요소를 함수로 뽑는다.

```js
function slide(color)                          // 배경색 지정된 새 슬라이드
function T(s, str, o)                          // 텍스트 (fontFace·margin 기본값 주입)
function SH(s, type, x, y, w, h, o)            // 도형
function card(s, x, y, w, h, o)                // 라운드 카드
function photo(s, x, y, w, h, file, o)         // 사진 (cover 크롭 + 그림자)
function imgFrame(s, x, y, w, h, label, o)     // 이미지 플레이스홀더
function pill(s, x, y, w, h, str, o)           // 알약 버튼
function pillRow(s, x, y, items, o)            // 알약 자동 줄바꿈 배치
function bullet(s, x, y, w, str, o)            // 불릿 (원 + 텍스트)
function marker(s, label)                      // 눈썹 라벨 (파란 짧은 선 + 텍스트)
function foot(s, no)                           // 러닝 푸터 + 페이지 번호
function heading(s, x, y, w, h, lines, o)      // 강조색 섞인 여러 줄 제목
function headingCenter(...)                    // 위와 같으나 가운데 정렬
function divider(...)                          // 섹션 디바이더
```

`T()`에 `fontFace`와 `margin: 0`을 기본으로 넣어두는 게 특히 중요하다.
pptxgenjs 기본 여백이 텍스트를 미묘하게 밀어내서, 좌표를 정확히 잡아도 어긋난다.

---

## 5. pptxgenjs 실전 함정

### 5-1. 여러 줄 제목에 `\n`을 쓰면 안 된다

`\n`이 들어간 run 뒤에 다른 run이 오면 **뒷부분이 별도 문단으로 분리되어 다음 줄과 잘못 합쳐진다.**
강조색이 섞인 제목에서 이게 터진다.

```js
// ❌ 깨짐
T(s, [{ text: "루틴은 내가,\n준비는 " }, { text: "청호", options: { color: C.blue } }]);

// ✅ breakLine 사용
function heading(s, x, y, w, h, lines, o) {
  const runs = [];
  lines.forEach((line, li) => line.forEach((r, ri) => {
    const last = ri === line.length - 1;
    const opt = { color: r.hl ? C.blue : C.ink, bold: true };
    if (last && li < lines.length - 1) opt.breakLine = true;   // ← 줄바꿈은 이걸로
    runs.push({ text: r.t, options: opt });
  }));
  T(s, runs, { x, y, w, h, fontSize: o.size, lineSpacing: o.ls, valign: "top" });
}

// 호출
heading(s, PAD, 1.1, CW, 1.0,
  [[{ t: "루틴은 내가," }],
   [{ t: "준비는 " }, { t: "청호", hl: true }, { t: "가." }]], { size: 46 });
```

### 5-2. `fill: "transparent"`는 파일을 깨뜨린다

```js
line: { type: "none" }        // ✅ 테두리 없음
fill: { type: "none" }        // ✅ 채움 없음
fill: { color: "transparent" } // ❌ 파워포인트가 복구 대화상자를 띄운다
```

### 5-3. 음수 너비를 조심

폭을 `총폭 - 계산값`으로 잡다가 음수가 되면 도형이 반대로 뒤집혀 겹친다.
**너비를 먼저 정하고 위치를 파생시키는 순서**로 쓰면 안 생긴다.

```js
// ✅
const gap = 0.26, cw = (CW - gap * 2) / 3;
const x = PAD + i * (cw + gap);
```

### 5-4. Python 문자열로 JS를 생성할 때

`re.sub()`의 치환 문자열에서 `\\n`은 **실제 개행으로 해석된다.** JS 리터럴이 깨진다.
`re.sub` 대신 `str.replace`를 쓰거나, 치환 후 문법 검사를 반드시 한다.

---

## 6. Pretendard 임베딩

한글 PPT의 가장 큰 함정. Pretendard는 웹폰트라 남의 PC에 없다.
맑은 고딕으로 폴백하면 자간·굵기가 무너져 디자인이 다 깨진다.

해결은 두 단계다.

### 6-1. OTF → TTF 변환

PPTX 임베딩은 TTF(glyf)만 받는다. Pretendard 배포본은 OTF(CFF)다.

```python
from fontTools.ttLib import TTFont
from fontTools.pens.cu2quPen import Cu2QuPen   # cu2qu 필요
# ... CFF 아웃라인을 quadratic으로 변환 후

maxp = font["maxp"]
maxp.tableVersion = 0x00010000
# CFF의 maxp에는 TT 전용 필드가 없어서 직접 채워야 한다. 안 하면 KeyError: 'maxZones'
maxp.maxZones = 1
for k in ("maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
          "maxStackElements", "maxSizeOfInstructions",
          "maxComponentElements", "maxComponentDepth"):
    setattr(maxp, k, 0)
```

Regular와 Bold 두 개만 넣으면 충분하다(각 약 3MB).

### 6-2. OOXML 직접 수정

pptxgenjs에 폰트 임베딩 기능이 없어서 zip을 열어 손으로 넣는다.
`embed_fonts.py` 전문이 저장소 밖(scratchpad)에 있지만 핵심은 네 곳이다.

```python
# 1) presentation.xml — 임베딩 켜기
pres = pres.replace('saveSubsetFonts="1"', 'saveSubsetFonts="0" embedTrueTypeFonts="1"', 1)

# 2) presentation.xml — defaultTextStyle 바로 앞에 폰트 목록 삽입
#    rId는 반드시 기존 최대값 + 1로 계산한다. 하드코딩하면 슬라이드가 늘어날 때 충돌한다
ids = [int(m) for m in re.findall(r'Id="rId(\d+)"', rels)]
RID_REG, RID_BLD = max(ids) + 1, max(ids) + 2
embed_lst = ('<p:embeddedFontLst><p:embeddedFont>'
             '<p:font typeface="Pretendard"/>'
             f'<p:regular r:id="rId{RID_REG}"/><p:bold r:id="rId{RID_BLD}"/>'
             '</p:embeddedFont></p:embeddedFontLst>')
pres = pres.replace("<p:defaultTextStyle>", embed_lst + "<p:defaultTextStyle>", 1)

# 3) ppt/_rels/presentation.xml.rels — 관계 추가
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"
rels = rels.replace("</Relationships>",
    f'<Relationship Id="rId{RID_REG}" Type="{REL}" Target="fonts/font1.fntdata"/>'
    f'<Relationship Id="rId{RID_BLD}" Type="{REL}" Target="fonts/font2.fntdata"/>'
    "</Relationships>", 1)

# 4) [Content_Types].xml — 확장자 등록
ct = ct.replace("</Types>",
    '<Default Extension="fntdata" ContentType="application/x-fontdata"/></Types>', 1)

# 그리고 ppt/fonts/font1.fntdata, font2.fntdata 로 TTF 바이트를 그대로 써넣는다
```

**하드코딩한 rId 때문에 한 번 터졌다.** 슬라이드를 26 → 28장으로 늘리자 rId33이 이미 점유돼 있었다.
반드시 동적으로 계산한다.

검수용으로 폰트를 시스템에도 설치해야 LibreOffice 렌더가 실제와 같아진다.

```bash
cp Pretendard-*.ttf /usr/share/fonts/truetype/pretendard/ && fc-cache -f
```

---

## 7. QA 파이프라인 — 이게 없으면 29장을 못 만든다

### 7-1. 넘침 자동 검출 (HTML)

가장 크게 시간을 아껴준 도구. **푸터를 침범했는지**를 기계가 판정한다.

```js
// fit.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file:///home/user/CHAI-AI/index.html');
  await p.addStyleTag({ content: '.deck{zoom:1 !important}.toolbar{display:none !important}' });
  await p.waitForTimeout(600);
  const res = await p.$$eval('.slide', els => els.map(e => {
    const inner = e.querySelector('.slide__inner');
    const foot  = e.querySelector('.slide__foot');
    if (!inner || !foot) return null;
    const kids = [...inner.children];
    const last = kids[kids.length - 1];
    if (!last) return null;
    const gap = foot.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
    return { id: e.id, gap: Math.round(gap) };
  }).filter(x => x && x.gap < 4));
  console.log('TIGHT/OVERLAP:', JSON.stringify(res));   // 빈 배열이면 전 장 통과
  await b.close();
})();
```

```bash
NODE_PATH=/opt/node22/lib/node_modules node fit.js
```

`scrollHeight > clientHeight`만 보면 안 된다. 절대배치 요소(오버레이 등) 때문에 오탐이 난다.
**마지막 자식의 바닥 vs 푸터의 top**을 비교하는 게 정확했다.

### 7-2. 어디가 넘치는지 측정

```js
// meas.js — 요소별 높이를 뽑아 어느 블록을 줄일지 판단
const r = await p.$eval('#' + process.argv[2], e => {
  const inner = e.querySelector('.slide__inner');
  return { pad: getComputedStyle(inner).padding, innerH: inner.clientHeight,
    kids: [...inner.children].map(c => ({
      cls: c.className.slice(0, 28),
      h: Math.round(c.getBoundingClientRect().height),
      mt: getComputedStyle(c).marginTop })) };
});
```

```
$ node meas.js s16
{ pad: "72px", innerH: 720,
  kids: [ {cls:"slide-head", h:131}, {cls:"row fill", h:404}, {cls:"card", h:74, mt:"11px"} ] }
```

`131 + 404 + 11 + 74 = 620` vs 가용 `720 - 144 = 576` → **44px 초과**. 어디를 깎을지 바로 보인다.

### 7-3. 스크린샷

```js
const el = await p.$('#' + id);
await el.screenshot({ path: `qa-${id}.png` });
```

### 7-4. PPTX 렌더 검수

```bash
apt-get install -y libreoffice-impress poppler-utils   # impress 없으면 무조건 실패한다

cp deck.pptx /tmp/qa/deck.pptx        # 파일명은 반드시 ASCII로
cd /tmp/qa
rm -rf ~/.config/libreoffice           # 프로필 꼬임 방지
soffice --headless --convert-to pdf --outdir . deck.pptx
pdftoppm -jpeg -r 96 deck.pdf s        # s-01.jpg …
```

**한글 파일명을 그대로 주면 "source file could not be loaded"가 뜬다.** ASCII로 복사해서 변환한다.
그리고 `libreoffice` 코어만 깔려 있으면 impress 필터가 없어서 전부 실패한다. 이걸로 한참 헤맸다.

컨택트 시트로 한 번에 훑는다(ImageMagick 없으면 PIL로).

```python
from PIL import Image; import glob
f = sorted(glob.glob('s-*.jpg'))
ims = [Image.open(x) for x in f[:9]]
w, h = ims[0].size; tw, th = int(w*.44), int(h*.44)
sh = Image.new('RGB', (3*tw+28, 3*th+28), 'white')
for i, im in enumerate(ims):
    r, c = divmod(i, 3); sh.paste(im.resize((tw, th)), (7+c*(tw+7), 7+r*(th+7)))
sh.save('sheet.png')
```

### 7-5. 파일 유효성 검사

```bash
python3 /root/.claude/skills/pptx/scripts/office/validate.py "deck.pptx"
# → All validations PASSED!
```

폰트 임베딩처럼 zip을 직접 건드린 뒤에는 매번 돌린다.

---

## 8. 페이지 맞춤 — 압축 순서

넘칠 때 어디를 줄이면 되는지 순서가 있다. 위에서부터 시도한다.

1. **중복 제거** — 결론 바가 말하는 걸 캡션이 또 말하고 있지 않은지
2. **바깥 여백** — `margin-bottom`, `gap` (가장 티가 안 난다)
3. **카드 padding** — `20px → 17px` 수준
4. **본문 `font-size` 0.5~1px, `line-height` 0.05** (0.5px 단위가 잘 먹는다)
5. **제목 크기** — 2줄이 1줄이 되면 한 번에 40~50px 벌린다
6. **이미지 높이**
7. **문장 자체를 줄이기** — 여기까지 왔으면 사실 글이 긴 거다

**PPTX는 HTML보다 20~40px 더 빡빡하다.** LibreOffice·파워포인트의 한글 줄높이가 브라우저보다 크다.
HTML에서 gap이 0~5px이면 PPTX에서는 거의 확실히 겹친다. HTML 기준으로 **10px 이상 여유**를 두는 게 안전하다.

PPTX는 좌표가 고정이라 `mt-a`(margin-top:auto) 같은 트릭이 없다.
행 높이를 늘릴 때는 **뒤따르는 모든 y좌표를 같이 밀어야** 한다. 이걸 잊어서 하단 바가 카드를 덮은 게 세 번 있었다.

---

## 9. 이미지 수집 — 뭐가 되고 뭐가 안 되는가

### ✅ YouTube 썸네일 — 가장 확실하다

원본 1280×720을 그대로 준다. 광고 스틸이 필요할 때 최고의 소스.

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
for r in maxresdefault sddefault hqdefault; do
  code=$(curl -sSL --max-time 20 -A "$UA" -o out.jpg -w "%{http_code}" \
    "https://img.youtube.com/vi/$VIDEO_ID/$r.jpg")
  [ "$code" = 200 ] && [ $(stat -c%s out.jpg) -gt 12000 ] && break
done
```

`maxresdefault`가 없는 영상도 있어서 해상도를 내려가며 시도한다.
크기가 12KB 미만이면 "없음" 플레이스홀더 이미지다.

**영상 ID는 웹 검색으로 찾는다.** YouTube 검색 페이지는 자동화 접근이 차단된다.

### ✅ Wikipedia pageimages API — 유명 마스코트

```bash
curl -sSL -A "$UA" "https://en.wikipedia.org/w/api.php?action=query&titles=Michelin_Man\
&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json"
```

Michelin Man, Ronald McDonald, Pillsbury Doughboy는 나왔다. Tony the Tiger, Mr. Peanut은 없었다.

### ✅ 기존 PPTX에서 미디어 추출 — 의외로 최고의 소스

검색으로 못 찾던 자사 과거 광고 이미지를 여기서 다 찾았다.

```bash
unzip -q deck.pptx -d x && ls x/ppt/media/
```

```python
from PIL import Image
im = Image.open("x/ppt/media/image8.png")
if im.mode in ("RGBA", "LA", "P"):          # 투명 배경은 흰색으로 합성
    im = im.convert("RGBA")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[-1]); im = bg
im.convert("RGB").save("out.jpg", quality=90, optimize=True)
```

**협업자가 이미 만든 파일이 있으면 거기부터 뒤진다.** 검색보다 빠르고 정확하다.

### ❌ Bing 이미지 검색 — 쓰지 마라

한국어 질의에 전혀 무관한(때로는 부적절한) 결과를 반환했다. 신뢰할 수 없다.

### ❌ Wikimedia Commons 검색 API

`gsrnamespace=6`으로 파일만 걸러도 PDF 스캔본만 올라온다. 페이지 이미지 API(위)가 낫다.

### ❌ 한국 기업 웹사이트

JS 렌더링 + 봇 차단. Playwright로도 `ERR_CONNECTION_RESET`이 났다.

### 프록시 환경 주의

- `User-Agent`를 반드시 넣는다. 없으면 400을 준다
- Wikimedia는 **허용된 썸네일 폭**만 받는다. 임의 폭은 404
- TLS 오류가 나도 `HTTPS_PROXY`를 절대 끄지 않는다

---

## 10. 이미지 프레임 — 비율이 전부다

가장 자주 실수한 부분. **프레임 비율과 원본 비율이 다르면 `cover`가 피사체를 잘라먹는다.**

한 번은 16:9 펭귄 이미지를 `550×128px`(4.3:1) 프레임에 넣어서 펭귄이 완전히 사라졌다.
"이미지가 깨졌나?" 하고 원본을 뒤졌지만 원본은 정상이었다. **프레임이 문제였다.**

판단 기준:

| 상황 | 처리 |
|---|---|
| 프레임 비율 ≈ 원본 비율 | `object-fit: cover` |
| 프레임이 훨씬 납작함 | **프레임 높이를 키운다** (원본을 자르지 말고) |
| 피사체가 한쪽에 있음 | 원본을 피사체 중심으로 미리 크롭 |
| 세로 영상(숏폼) | 중앙 띠를 16:9로 잘라 저장 |

```python
# 세로 이미지를 16:9 중앙 띠로
im = Image.open(p); w, h = im.size
th = int(w * 9 / 16); top = max(0, (h - th) // 2)
im.crop((0, top, w, top + th)).save(p, quality=90)
```

작은 원본은 프레임보다 크게 업스케일해두면 인쇄 시 흐려지지 않는다.

```python
if im.width < 900:
    im = im.resize((900, int(im.height * 900 / im.width)), Image.LANCZOS)
```

그리고 **눈으로 확인하는 걸 건너뛰지 마라.** 프레임 크기로 시뮬레이션해서 미리 본다.

```python
tw, th = 200, 76                                  # 실제 프레임 크기
r = max(tw/im.width, th/im.height)                # cover 스케일
im2 = im.resize((int(im.width*r), int(im.height*r)))
l, t = (im2.width-tw)//2, (im2.height-th)//2
im2.crop((l, t, l+tw, t+th)).save("preview.png")  # 이걸 보고 판단
```

---

## 11. 장표 설계에서 배운 것

### 사분면(2×2)은 생각보다 안 읽힌다

축 두 개를 동시에 조합해야 하니 청중이 "가로가 인지도고 세로가 효과니까, 여긴 인지 높고 효과 낮은 자리네"를 머릿속에서 계산해야 한다. 실제로 "이해가 어렵다"는 피드백을 받았다.

**한 방향으로 읽히는 단계형으로 바꾸니 해결됐다.**

```
적극 ─ 헤리티지 리바이벌        기억 O · 효과 O
기본 ─ 신규 마스코트  [유력]    기억 X · 효과 O
제한 ─ 광고 아카이브            기억 O · 효과 X
중단 ─ 전략에서 제외            기억 X · 효과 X
```

조건을 `O/X` 태그로 각 줄에 붙이면 축 해석이 필요 없어진다.
그리고 상위 두 줄만 파란색으로 두니 "여기까지가 간다는 쪽"이 저절로 구분됐다.

### 사분면을 쓸 거면 위치와 라벨을 반드시 맞춰라

물려받은 장표에서 "인지 낮음·적합 높음"이라고 쓴 칸이 가로축 높은 쪽에 있었다.
발표 중에 바로 지적당할 오류다. **축 정의 → 사분면 배치 → 라벨** 순서로 검산한다.

### 슬라이드끼리 손을 잡게 만든다

각 장 끝에 다음 장의 질문을 한 줄로 던지면 파트 전체가 하나의 흐름으로 읽힌다.
비용이 거의 안 드는데 효과가 컸다.

```
11장 끝 → "그렇다면 이 역할을 2030의 머릿속에 어떻게 남길 것인가."
12장 끝 → "그런데 우리는 캐릭터를 새로 만들 필요가 없다."
13장 끝 → "그럼 청호나이스의 어떤 자산을 되살릴 것인가."
```

여기에 눈썹 라벨로 현재 위치를 표시한다: `03 · 브랜드 전략 · 04 왜 펭귄인가`

### 숫자를 쓸 때는 척도를 설명한다

"2.8★" 같은 걸 그냥 놓으면 아무 의미가 없다. 실제로 "이게 뭘 의미하는지 알 수 없다"는 지적을 받았다.

고친 방법:

1. **조사 개요 블록**을 옆에 붙인다 — 조사기관, 대상, 기간, 측정 방식
2. **눈금 있는 막대**로 바꾼다 — `1.0 ─ 2 보통 ─ 3 양호 ─ 4 강함 ─ 5.9`
3. 척도의 시작점을 반영한다. 1.0~5.9 척도면 0이 아니라 **1.0을 원점**으로 잡아야 차이가 정직하게 보인다

```
width = (value - 1) / (5.9 - 1) * 100%
```

### 한 장에 프레임 하나

12장에 이론 프레임 3개를 얹었더니 "정보가 너무 많다"는 지적을 받았다.
측정 프레임(Distinctive Brand Assets)은 **측정을 다루는 16장으로 옮겼더니** 양쪽이 다 좋아졌다.

빼도 되는 것들:
- 발표자 관점의 메타 문장 ("이 장은 단순한 설문 계획이 아니라…")
- 우리가 쓰지 않은 수치를 왜 안 썼는지 설명하는 각주
- 추상적인 4단계 흐름 (어느 브랜드에나 해당되면 자리값을 못 한다)

---

## 12. 카피 — AI 티 걷어내기

이 프로젝트에서 실제로 걸린 것들.

**금지**

- `—` (em 대시) 남용 → 문장으로 풀거나 마침표로 끊는다
- "A가 아니라 B다" 반복 → 제목마다 이 구조면 티가 난다
- "단순히 A를 넘어 B로", "새로운 패러다임", "궁극적으로", "이를 통해", "접점을 확장한다"
- 기계적 볼드 남발, 이모지, 3의 법칙 반복, 짧은 파편 나열

**하기**

- 제목은 명사가 아니라 **판단 문장**으로
  - ✗ `인지도 및 고유성 검증 전략`
  - ✓ `펭귄의 현재 가치를 검증해, 활용 수준을 결정한다`
- 학술 내용도 구어체로 옮긴다
  - ✗ "사물에 사람의 성격을 부여하면 더 호의적으로 평가한다"
  - ✓ "사물에 사람 성격을 입히면 사람들은 그 대상을 더 좋게 본다"
- 본문 3문장 이내, 데이터는 장당 2개까지
- 인터뷰 발화는 다듬지 말고 실제 말투로 남긴다

**협업자가 직접 쓴 문장은 건드리지 않는다.** 내가 쓴 연결문만 고친다.
초안으로 채운 문구에는 눈에 보이는 태그(`초안 · 문구 교체`)를 달아 교체 대상임을 표시한다.

---

## 13. 데이터 무결성

발표에서 깨질 지점을 미리 막는 규칙.

| 규칙 | 실제 사례 |
|---|---|
| 재인용 수치는 원출처 확인 전까지 본문 제외 | "88% 회상", "73% 수익"은 각주로만 |
| 2차 인용본 대신 원문 수치를 쓴다 | 별점이 2차 인용에선 3.8/2.7, 원문은 **3.7/2.8** |
| 추정치는 실측치로 바꾼다 | 캡슐 720원(추정) → **544원**(16개입 8,700원). 회수 잔수가 42 → 37로 바뀜 |
| 글로벌 수치를 국내 수치처럼 쓰지 않는다 | 딜로이트 70%는 13개국 값. `해외 기준 · 참고` 띠로 분리 |
| 없는 통계는 없다고 쓴다 | "국내 '집에서 마시는 비율' 공식 통계는 확보 전이며, 보유율·성장률로 대신했다" |
| 가정치는 가정치로 표기 | 카페 중가·프리미엄 단가, 드립 원가 |

마지막 항목이 제일 중요하다. **모르는 걸 아는 척하면 질의응답에서 무너진다.**
"확보 중"이라고 쓰면 오히려 신뢰가 올라간다.

---

## 14. 크게 데인 것들

### 슬라이드가 조용히 사라졌다

주석 헤더를 기준으로 구간을 잘라 교체했는데, 주석 번호를 갱신하지 않아서
`'// 14 ·'`를 찾을 때 **다음 슬라이드의 주석이 걸려 한 장이 통째로 삭제됐다.**
PPTX 빌더는 따로였으니 그쪽엔 남아 있어서, HTML 27장 / PPTX 28장으로 며칠 굴러갔다.

- 대비: 매번 `grep -c '<section class="slide'`로 장수를 확인한다
- 복구: `git show <commit>:index.html`로 이전 버전에서 꺼내 재삽입

### zero-padding 때문에 id가 안 바뀌었다

`id="s7"`로 치환하려 했는데 실제 표기는 `id="s07"`이었다.
7~9번은 그대로 남고 10번 이상만 바뀌어서 **id가 중복됐다.**

- 대비: 치환 후 `grep -o 'id="s[0-9b]*"' | sort | uniq -d`로 중복 확인
- 번호 표기는 처음부터 통일한다

### 좌표를 늘렸는데 뒷부분을 안 밀었다

PPTX에서 카드 높이를 키우고 하단 바 y좌표를 그대로 뒀다. 바가 카드를 덮었다.
행 높이·개수를 건드리면 **그 아래 모든 y를 함께 조정한다.** 렌더해서 눈으로 확인하는 게 유일한 안전장치.

---

## 15. 작업 리듬

한 장을 고칠 때의 실제 루프.

```bash
# 1. HTML 수정 (python으로 구간 치환)
# 2. 넘침 확인
NODE_PATH=/opt/node22/lib/node_modules node fit.js
# 3. 넘치면 원인 측정
NODE_PATH=/opt/node22/lib/node_modules node meas.js s16
# 4. 눈으로 확인
NODE_PATH=/opt/node22/lib/node_modules node shot.js s16
# 5. 빌더에 같은 변경 반영
# 6. 빌드 → 폰트 임베딩 → 검증
NODE_PATH=/opt/node22/lib/node_modules node build2.js
python3 embed_fonts.py
python3 /root/.claude/skills/pptx/scripts/office/validate.py "…​.pptx"
# 7. PPTX 렌더해서 그 장만 확인 (HTML보다 빡빡하므로 필수)
soffice --headless --convert-to pdf --outdir . deck.pptx
pdftoppm -jpeg -r 96 -f 20 -l 20 deck.pdf s
# 8. 커밋
```

**7번을 건너뛰면 반드시 겹친다.** HTML에서 통과했다고 PPTX가 통과하는 게 아니다.

---

## 16. 요약: 다시 한다면

1. **1280×720 / 13.333×7.5in 좌표계를 처음부터 고정**한다
2. **HTML을 원본으로, PPTX를 산출물로** 둔다. 단 양쪽 동기화를 잊지 않는다
3. **넘침 검출을 자동화**한다. 이게 없으면 장수가 늘수록 손으로 못 잡는다
4. **폰트는 임베딩**한다. rId는 동적 계산
5. **PPTX를 반드시 렌더해서 본다.** HTML 통과 ≠ PPTX 통과
6. **이미지는 프레임 비율부터** 맞춘다. 원본을 의심하기 전에 프레임을 본다
7. **협업자의 기존 파일을 먼저 뒤진다.** 검색보다 정확한 자산이 들어 있다
8. **모르는 숫자는 모른다고 쓴다**
9. **사분면보다 단계형**이 읽힌다
10. **장수를 매번 센다**
