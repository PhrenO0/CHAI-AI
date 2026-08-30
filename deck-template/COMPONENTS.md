# 컴포넌트 참조

`styles/deck.css`에 들어 있는 것들. 어떤 정보를 보여줄 때 무엇을 쓰면 되는지 정리했다.

**장마다 다른 컴포넌트를 쓴다.** 전 장을 "카드 3개"로 만들면 티가 난다.
컴포넌트를 30개 넘게 넣어둔 이유가 이것이다.

---

## 슬라이드 골격

```html
<section class="slide" id="s05">          <!-- slide--dark / slide--parchment 로 배경 변경 -->
  <div class="slide__inner col between">  <!-- between = 위/아래로 벌림 -->
    <div class="slide-head">
      <div class="marker"><span class="marker__label">01 · 브랜드 진단 · 01 카테고리</span></div>
      <h2 class="h-lg">판단 문장으로 쓴 제목</h2>
    </div>

    <!-- 본문 블록들 -->

  </div>
  <div class="slide__foot">러닝 푸터</div>
  <div class="slide__no">05</div>
</section>
```

`.slide__inner`의 **마지막 자식 바닥과 `.slide__foot` 사이 간격**을 `build/qa/fit.js`가 검사한다.
10px 이상 남기는 게 안전하다(PPTX가 브라우저보다 20~40px 빡빡하다).

---

## 타이포

| 클래스 | 크기 | 용도 |
|---|---|---|
| `.h-hero` | 60px | 표지 |
| `.h-title` | 40px | 파트 제목, 큰 선언 |
| `.h-lg` | 33px | 2줄짜리 슬라이드 제목 |
| `.h-md` | 25px | 1줄짜리 슬라이드 제목 (가장 많이 쓴다) |
| `.lead` | 19px | 도입 문장 |
| `.body` | 16px | 본문 |
| `.small` | 14px | 보조 설명 |
| `.tiny` | 12px | 캡션 |
| `.src` | 8.5px | 출처 (우하단) |

강조는 `<span class="hl">`. 다크 배경에서는 자동으로 밝은 파랑으로 바뀐다.
`.pullquote`는 30px 대형 인용, `.quote-real`은 실제 발화용(따옴표가 자동으로 붙는다).

---

## 정보 유형별 선택

### 순서·시간

| 컴포넌트 | 언제 |
|---|---|
| `.flow` | 짧은 전환 단계 (칩 → 화살표). 4~6개 |
| `.chain` | 세로로 이어지는 서사. 단계마다 설명이 길 때 |
| `.tl` | 연혁 타임라인. 연도가 있을 때 |
| `.day` | 하루 시나리오. `.reddot`으로 마찰 지점 표시 |
| `.journey` | 가로 6단계 여정. 단계마다 역할까지 쓸 때 |
| `.stepline` | 4단계 압축 표시. 한 줄에 넣고 싶을 때 |
| `.proc` | 절차 비교 (직접 N단계 vs 우리 M단계) + 절감 콜아웃 |

### 비교

| 컴포넌트 | 언제 |
|---|---|
| `.g2` + `.card` | 현재 과제 / 우리의 재해석 같은 2분할 |
| `.ba` | Before / After 2열 (오른쪽이 다크) |
| `.cwall` | 경쟁사 카피 2×2. 브랜드명이 박스 위 중앙 |
| `.wall` | 4열 메시지 월. 반복 단어를 `.k1`~`.k4`로 색칠 |
| `.ptable` | 중앙 허브 원 + 좌우 대응 표. **`--rows`로 행 수를 반드시 준다** |

### 의사결정

| 컴포넌트 | 언제 |
|---|---|
| `.ladder` | **의사결정에는 이걸 쓴다.** 한 방향 단계 + 줄마다 O/X 조건 |
| `.matrix` | 세그먼트 지도처럼 "어디를 고를지"만 보여줄 때 |

사분면(`.matrix`)은 축 두 개를 머릿속에서 조합해야 해서 잘 안 읽힌다.
실제로 "이해가 어렵다"는 피드백을 받고 `.ladder`로 바꿔 해결했다.

```html
<div class="ladder">
  <div class="lrow lrow--on lrow--pick">
    <span class="lrow__lv">적극</span>
    <span><span class="lrow__t">전면 복원</span><span class="tag-pick">유력</span>
          <span class="lrow__d">캠페인 중심에 놓고 전 채널에서 쓴다</span></span>
    <span class="ox"><span class="o">기억 O</span><span class="o">적합 O</span></span>
  </div>
  <!-- 아래로 갈수록 조건이 나빠지는 순서로 배치 -->
</div>
```

사분면을 쓸 거면 **축 정의 → 사분면 배치 → 라벨** 순서로 검산한다.
"낮음"이라고 쓴 칸이 축 높은 쪽에 있는 사고가 실제로 있었다.

### 수치

| 컴포넌트 | 언제 |
|---|---|
| `.tbl` | 표. 벤치마크·대응표처럼 행이 반복될 때. 세로 괘선은 넣지 않는다 |
| `.hbar` | 가로 막대 목록. 항목 4~6개에 값이 한 종류일 때 라벨이 잘 읽힌다 |
| `.stat` | 큰 숫자 하나 (46px) + 라벨 |
| `.bars` | 누적 막대 3~4 시나리오. `.seg--a`~`.seg--d` |
| `.funnel` | 4단계 퍼널 (폭이 좁아진다) |
| `.trend` | 우상향 추세. 인라인 SVG |
| `.gauge` | 페르소나 성향 게이지 |
| `.rate` + `.spec` | **척도가 있는 점수.** 눈금 + 조사 개요를 반드시 같이 |

`.rate`를 쓸 때 원점 주의. 척도가 1.0~5.9면 0이 아니라 1.0을 원점으로 잡는다.

```
width = (값 - 최소) / (최대 - 최소) × 100%
```

### 이미지

| 컴포넌트 | 언제 |
|---|---|
| `.imgframe` | 이미지 자리. 사선 무늬 + 라벨. 편집 모드에서 업로드 가능 |
| `.imgframe--dark` | 다크 슬라이드용 |
| `.thumbs` / `.thumbs-grid` | 썸네일 3열 / 4열 |
| `.sb` | 스토리보드 스트립 4컷 |
| `.reveal` | 회색 리빌. 썸네일을 눕히고 중앙에 판단 문장 |

**프레임 비율이 원본 비율과 다르면 피사체가 잘린다.**
16:9 이미지를 4.3:1 프레임에 넣어 피사체가 완전히 사라진 적이 있다.
원본을 의심하기 전에 프레임을 본다. 자세한 건 `PLAYBOOK.md` 10장.

### 연결·표시

| 컴포넌트 | 언제 |
|---|---|
| `.handoff` | 장 끝에서 다음 장의 질문을 던지는 한 줄 |
| `.marker` | 눈썹 라벨. 현재 위치를 `03 · 파트 · 02 소제목` 형태로 |
| `.tbd` | "출처 확인 예정" 표시 |
| `.draft` | "초안" 표시. 교체 대상 문구임을 눈에 보이게 |
| `.numbadge` / `.numpill` | 번호 배지 |
| `.neq` | A ≠ B 대조. 흔한 오해를 한 줄로 끊을 때 |
| `.zones` | 4존 동선 (팝업·공간 설계) |
| `.change` | 다크 슬라이드에서 Before → After 4열 |
| `.divider-num` | 섹션 디바이더의 대형 숫자 (210px, 아주 옅게) |

`.handoff`는 비용이 거의 안 드는데 파트 전체가 하나의 흐름으로 읽힌다.

```html
<div class="handoff"><b>다음</b><span>그 O/X는 무엇으로 판정하는가.</span></div>
```

---

## 그리드 유틸

```
.grid .g2 .g3 .g4      그리드 2·3·4열
.row  .col             flex 가로 / 세로
.between .center       justify / align
.fill                  남는 공간 차지 (flex: 1)
.mt-a                  margin-top: auto (아래로 밀기, HTML 전용)
```

`.mt-a`는 PPTX에 대응물이 없다. PPTX는 좌표가 고정이라
행 높이를 늘리면 **그 아래 모든 y를 함께 밀어야** 한다.

---

## build.js 헬퍼 대응표

HTML 컴포넌트와 PPTX 헬퍼는 일대일로 짝이 있다.

| CSS | build.js |
|---|---|
| `.card` | `card(s, x, y, w, h, o)` |
| `.marker` | `marker(s, label, y, dark)` |
| `h2` + `.hl` | `heading(s, x, y, w, h, lines, o)` |
| `.flow__chip` | `pill(s, x, y, w, h, str, o)` |
| `.commonwords` | `pillRow(s, x, y, items, o)` |
| `.li` | `bullet(s, x, y, w, str, o)` |
| `.imgframe` | `imgFrame(s, x, y, w, h, label, o)` |
| 실제 이미지 | `photo(s, x, y, w, h, file, o)` |
| `.handoff` | `handoff(s, y, str)` |
| `.slide__foot` + `.slide__no` | `foot(s, no, dark)` |
| 디바이더 슬라이드 | `divider(en, num, title, items)` |

나머지(타임라인·막대·퍼널 등)는 각 슬라이드 함수 안에서 도형으로 조립한다.
같은 패턴을 세 번 이상 쓰게 되면 그때 헬퍼로 뽑는다.
