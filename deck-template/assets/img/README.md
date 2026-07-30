# 이미지 넣는 곳

여기에 이미지를 두고 슬라이드의 `.imgframe`을 실제 이미지로 교체한다.

## HTML 쪽

편집 모드에서 이미지 자리를 클릭하거나 파일을 드래그하면 바로 들어간다.
그렇게 넣은 이미지는 브라우저 저장소에 base64로 들어가므로,
장수가 많으면 용량 한도에 걸린다. 확정된 이미지는 파일로 두고 직접 태그를 쓰는 게 낫다.

```html
<div class="imgframe" style="width:330px; height:200px">
  <img class="uploaded" src="assets/img/hero.jpg" alt="">
</div>
```

## PPTX 쪽

`build/build.js`에서 `imgFrame(...)`을 `photo(...)`로 바꾼다.

```js
// 전
imgFrame(s, PAD, 3.9, 3.45, 1.62, "[ 과거 캠페인 스틸 ]");
// 후
photo(s, PAD, 3.9, 3.45, 1.62, IMGDIR + "campaign-still.jpg");
```

## 비율을 먼저 맞춘다

프레임 비율과 원본 비율이 다르면 `cover`가 피사체를 잘라먹는다.
16:9 이미지를 4.3:1 프레임에 넣어 피사체가 완전히 사라진 사고가 있었다.
넣기 전에 프레임 크기로 시뮬레이션해서 눈으로 확인한다.
자세한 건 `../../PLAYBOOK.md` 10장.

작은 원본은 미리 키워둔다. 프레임보다 작으면 인쇄에서 흐려진다.

```python
from PIL import Image
im = Image.open("in.jpg")
if im.width < 900:
    im = im.resize((900, int(im.height * 900 / im.width)), Image.LANCZOS)
im.convert("RGB").save("out.jpg", quality=90, optimize=True)
```
