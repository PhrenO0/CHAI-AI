# DECK TEMPLATE — 1280×720 한글 기획서 덱 템플릿

브라우저에서 편집하는 HTML 덱과, 파워포인트에서 텍스트를 직접 고칠 수 있는 PPTX를
**한 소스에서** 뽑는 템플릿이다. 스크린샷을 붙이는 방식이 아니라 전부 네이티브 도형·텍스트로 만든다.

내용은 전부 가상의 브랜드(NOVA / 에어핏 공기청정기)로 채운 **예시**다.
구조와 컴포넌트만 가져다 쓰고 문구는 교체하면 된다.

```
deck-template/
├─ index.html            예시 덱 19장. 여기를 고친다 (원본)
├─ styles/deck.css       디자인 시스템. 토큰 + 컴포넌트 32종
├─ PLAYBOOK.md           제작 노하우 전문 (좌표계·함정·QA·설계 교훈)
├─ COPY-GUIDE.md         슬라이드 말투 지침 (AI 티 제거 규칙)
├─ COMPONENTS.md         컴포넌트별 용도와 사용법
├─ assets/img/           이미지 넣는 곳
└─ build/
   ├─ build.js           pptxgenjs 빌더. index.html과 같은 19장
   ├─ embed_fonts.py     PPTX에 한글 폰트 임베드
   ├─ otf2ttf.py         OTF → TTF 변환 (임베딩 전 단계)
   ├─ package.json
   └─ qa/
      ├─ fit.js          넘침 자동 검출 ★ 가장 중요
      ├─ meas.js         어느 블록이 넘치는지 측정
      ├─ shot.js         슬라이드 스크린샷
      ├─ render.sh       PPTX → 이미지 렌더
      └─ sheet.py        컨택트 시트 만들기
```

---

## 1. HTML 덱만 쓸 경우

`index.html`을 브라우저로 열면 끝이다. 설치할 게 없다.

- 우상단 **수정 모드** → 텍스트를 클릭해 바로 고친다
- 텍스트를 선택하고 **강조** → 파란 강조색을 씌운다 (HTML을 안 건드린다)
- 이미지 자리(사선 무늬 박스)를 **클릭하거나 드래그** → 이미지 업로드
- 수정 내용은 브라우저에 자동 저장된다. **내보내기**로 HTML 파일을 받는다
- 인쇄(Ctrl+P, 가로) → 슬라이드당 PDF 한 장

> 내보낸 HTML은 같은 폴더의 `styles/deck.css`를 참조한다. **폴더째로** 보관하거나 전달한다.

---

## 2. PPTX까지 만들 경우

### 준비

```bash
cd build && npm install          # pptxgenjs, playwright
```

폰트를 임베딩하려면 TTF가 필요하다. Pretendard 배포본은 OTF이므로 한 번 변환한다.

```bash
pip install fonttools cu2qu
python3 build/otf2ttf.py Pretendard-Regular.otf Pretendard-Regular.ttf
python3 build/otf2ttf.py Pretendard-Bold.otf    Pretendard-Bold.ttf
```

검수 렌더링에는 LibreOffice가 필요하다. **`libreoffice-impress`를 반드시 같이 깐다** (코어만 있으면 전부 실패한다).

```bash
apt-get install -y libreoffice-impress poppler-utils
```

### 빌드

```bash
# 1) 넘침 검사 — 이게 통과해야 PPTX로 넘어간다
node build/qa/fit.js
#   OVERLAP : none
#   TIGHT   : none

# 2) 빌드
node build/build.js
#   built: build/out/deck.pptx | slides: 19

# 3) 폰트 임베드 (선택이지만, 남에게 보낼 파일이면 필수)
python3 build/embed_fonts.py build/out/deck.pptx \
  --regular /path/Pretendard-Regular.ttf \
  --bold    /path/Pretendard-Bold.ttf \
  --name    Pretendard

# 4) 렌더해서 눈으로 확인 — 건너뛰면 반드시 겹친다
bash build/qa/render.sh build/out/deck.pptx
python3 build/qa/sheet.py build/qa/out 3 3
```

Node 모듈이 전역에 있는 환경이면 `NODE_PATH`를 앞에 붙인다.

```bash
NODE_PATH=/opt/node22/lib/node_modules node build/qa/fit.js
```

QA 스크립트는 다른 덱도 검사할 수 있다. `DECK`에 경로를 준다.

```bash
DECK=../lectures/ai-literacy/index.html node build/qa/fit.js
DECK=../lectures/ai-literacy/index.html node build/qa/shot.js s12
```

---

## 3. 내 프로젝트로 바꾸기

### 색

`styles/deck.css`의 `:root`에서 아래 4개, `build/build.js`의 `C`에서 같은 4개를 바꾼다.
그 외 색은 회색 계열이라 대부분 그대로 쓸 수 있다.

```css
--blue: #0057ff;          /* 단일 강조색 */
--blue-fill: #1e9be6;     /* 배지·서클 채움 */
--blue-on-dark: #2997ff;  /* 다크 배경 위 */
--blue-wash: #eaf1ff;     /* 옅은 배경 */
```

**강조색은 하나만 쓴다.** 두 개 이상 쓰면 어디가 중요한지 사라진다.

### 폰트

`styles/deck.css`의 `--sans`, `build/build.js`의 `FONT` 두 곳.
CSS는 폴백 스택이 있어서 폰트가 없어도 깨지지 않지만, PPTX는 폴백 개념이 없으니
**받는 사람 PC에 없는 폰트라면 반드시 임베딩한다.**

### 푸터·저자

- `index.html`: `.slide__foot` 텍스트, 표지의 이름
- `build/build.js`: `FOOT` 상수

### 슬라이드 추가·삭제

**HTML과 build.js를 항상 같이 고친다.** 한쪽만 고치면 조용히 어긋난다.
실제 프로젝트에서 HTML 27장 / PPTX 28장으로 며칠 굴러간 적이 있다.

```bash
grep -c '^<section class="slide' index.html      # 장수 확인
grep -o 'id="s[0-9b]*"' index.html | sort | uniq -d   # id 중복 확인
```

---

## 4. 먼저 읽으면 좋은 것

| 문서 | 언제 |
|---|---|
| `COMPONENTS.md` | 어떤 레이아웃을 쓸지 고를 때 |
| `COPY-GUIDE.md` | 문구를 쓸 때 · 다 쓰고 검수할 때 |
| `PLAYBOOK.md` | 좌표가 안 맞을 때, PPTX가 깨질 때, 폰트가 안 박힐 때 |

특히 `PLAYBOOK.md`의 **5장(pptxgenjs 함정)** 과 **7장(QA 파이프라인)** 은
직접 부딪히기 전에 읽어두면 시간을 크게 아낀다.

---

## 5. 예시 덱 19장 구성

각 장이 서로 다른 레이아웃 패턴을 하나씩 보여준다.

| # | 내용 | 레이아웃 패턴 |
|---|---|---|
| 01 | 표지 | 다크 타일 + 중앙 정렬 + 히어로 이미지 |
| 02 | 과제 정의 | 제목 + 리드 + 카드 2 + 전환 플로우 |
| 03 | 전략 한 장 | A/B 박스 + 하단 결론 바 |
| 04 | 디바이더 | 다크 + 대형 숫자 + 목차 |
| 05 | 경쟁 카피 | 마스킹 2×2 + 공통 언어 태그 |
| 06 | 현 주소 | 회색 리빌 (썸네일 + 베일 + 중앙 선언) |
| 07 | 보유 자산 | 타임라인 + 목록 + 이미지 |
| 08 | 디바이더 | |
| 09 | 핵심 타깃 | 2×2 세그먼트 맵 + 페르소나 게이지 |
| 10 | 생활 시나리오 | 하루 타임라인 + 마찰 레드닷 + 발화 인용 |
| 11 | 경제성 | 누적 막대 3 시나리오 + 범례 |
| 12 | 핵심 인사이트 | 대형 문장 + 근거 카드 2 |
| 13 | 디바이더 | |
| 14 | 제품의 역할 | 중앙 허브 + 좌우 대응 표 |
| 15 | 자산 활용 수준 | **사다리형 의사결정 + O/X** (2×2 대체) |
| 16 | 검증 설계 | 눈금 척도 막대 + 조사 개요 + 4단계 |
| 17 | 캠페인 여정 | 6단계 가로 여정 + 존 4 |
| 18 | 결과 검증 | 퍼널 + 측정 노트 |
| 19 | 마무리 | 다크 + 변화 4열 + 풀블리드 문구 |
