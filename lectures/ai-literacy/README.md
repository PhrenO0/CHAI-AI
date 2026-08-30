# AI 교양의 이해 — 생성형 AI, 답변에서 실행으로

원본 PDF(18장)를 `deck-template`의 디자인 시스템으로 다시 만든 수업 자료다.
브라우저에서 고치는 HTML 덱과, 파워포인트에서 텍스트를 직접 고칠 수 있는 PPTX를 한 소스에서 뽑는다.

```
lectures/ai-literacy/
├─ index.html          18장. 여기를 고친다 (원본)
├─ styles/deck.css     deck-template과 같은 디자인 시스템
└─ build/
   ├─ build.js         pptxgenjs 빌더. index.html과 같은 18장
   └─ out/             빌드 결과 (git 제외)
```

---

## 열기

`index.html`을 브라우저로 열면 끝이다.

- 우상단 **수정 모드** → 텍스트를 클릭해 바로 고친다
- 텍스트를 선택하고 **강조** → 파란 강조를 씌운다
- **내보내기** → 수정본 HTML 저장 · 인쇄(Ctrl+P, 가로) → 슬라이드당 PDF 한 장

## PPTX 빌드

```bash
# 넘침 검사
DECK=lectures/ai-literacy/index.html node deck-template/build/qa/fit.js

# 빌드
node lectures/ai-literacy/build/build.js

# 폰트 임베드 (남에게 보낼 파일이면 필수)
python3 deck-template/build/embed_fonts.py lectures/ai-literacy/build/out/ai-literacy.pptx \
  --regular /usr/share/fonts/truetype/pretendard/Pretendard-Regular.ttf \
  --bold    /usr/share/fonts/truetype/pretendard/Pretendard-Bold.ttf

# 렌더해서 눈으로 확인
bash deck-template/build/qa/render.sh lectures/ai-literacy/build/out/ai-literacy.pptx
```

자세한 건 `deck-template/README.md`와 `deck-template/PLAYBOOK.md`.

---

## 구성 18장

| # | 섹션 | 내용 | 레이아웃 |
|---|---|---|---|
| 01 | | 표지 | 다크 |
| 02 | TODAY’S QUESTION | AI가 과제를 대신하면 나는 무엇을 배운 것일까 | 대형 문장 + 관점 3 |
| 03 | LEARNING GOALS | 작동 원리 · 활용 판단 · 검증 책임 | 넘버드 카드 3 |
| 04 | CONCEPT 01 | 생성형 AI란 무엇인가 | 인용 + 부등호 대조 |
| 05 | CONCEPT 02 | 결과는 네 단계에서 달라진다 | 4단계 흐름 + 공식 바 |
| 06 | CONCEPT 03 | 검색 · 변환 · 실행 | 3열 + 검증 부담 게이지 |
| 07 | SHIFT | 답변형에서 실행형으로 | Assistant / Agent |
| 08 | CASE STUDY | 사례 모델 소개 | 좌 불릿 + 우 데모 목록 |
| 09 | DATA | 벤치마크 5종 비교 | 표 + 단위 주의 |
| 10 | CRITICAL READING | 대표성 · 재현성 · 비용 · 책임 | 카드 4 + 결론 바 |
| 11 | APPLICATION | 대학생 과제 적용 4가지 | 대응표 |
| 12 | SYNTHETIC DATA | 주 사용 목적 | 가로 막대 + 표 |
| 13 | SYNTHETIC DATA | 검증 습관 분포 | 가로 막대 + 결론 |
| 14 | PRACTICE | 4단계 검증 프로토콜 | 넘버드 카드 4 |
| 15 | LAB | 강의자료 → 학습 페이지 변환 | 과업 + 완성 조건 |
| 16 | DISCUSSION | 정확성 · 저작권 · 개인정보 · 저자성 | 카드 4 + 인용 |
| 17 | CHECK | 미니 퀴즈 5문항 | 번호 목록 |
| 18 | WRAP-UP | 과제 및 출처 | 다크 + 주의 배너 |

---

## 원본 표기를 유지한 것

이 자료의 수치와 주의 문구는 원본 PDF를 그대로 옮긴 것이다. 다음 세 가지는 **지우지 않는다.**

- 전 슬라이드 하단 : `수업용 예시 자료 · 실제 강의자료 아님`
- 09장 : 정확도(%)와 Elo는 단위가 달라 합산할 수 없다는 주의
- 12 · 13장 : `n = 120`은 실제 조사가 아닌 수업용 가상 데이터라는 표시, 18장의 인용 금지 배너

8장 사례와 9장 벤치마크는 원본이 밝힌 출처(Google, 2026.08.13)를 그대로 표기했고,
따로 검증하지 않았다. 실제 강의에 쓸 때는 원문을 한 번 확인한 뒤 쓰는 게 안전하다.

12장 하단의 "과제 요약과 시험 복습이 68명" 한 줄은 원본에 없던 문장이다.
표에 있는 38 + 30을 더한 값이며, 원본 수치를 벗어나지 않는다.
