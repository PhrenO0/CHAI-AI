#!/usr/bin/env python3
"""
============================================================
otf2ttf.py — OTF(CFF) 폰트를 TTF(glyf)로 변환
------------------------------------------------------------
PPTX 폰트 임베딩은 TTF(glyf 아웃라인)만 받는다.
Pretendard를 비롯한 많은 한글 폰트 배포본은 OTF(CFF 아웃라인)라서
그대로 넣으면 파워포인트가 무시하거나 파일이 깨진다.

여기서 한 번 데였던 지점:
  CFF 폰트의 maxp 테이블에는 TrueType 전용 필드가 아예 없다.
  변환 후 그 필드들을 직접 채워주지 않으면 KeyError: 'maxZones' 로 죽는다.

필요 패키지:
    pip install fonttools cu2qu

사용:
    python3 build/otf2ttf.py Pretendard-Regular.otf Pretendard-Regular.ttf
============================================================
"""
import sys

from fontTools.ttLib import TTFont, newTable
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

MAX_ERR = 1.0  # em 단위 허용 오차. 1.0이면 눈으로 차이를 못 느낀다.


def convert(src, dst):
    font = TTFont(src)
    if "glyf" in font:
        print("이미 TTF입니다. 그대로 복사만 하면 됩니다.")
        font.save(dst)
        return

    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()
    upem = font["head"].unitsPerEm

    glyf_glyphs = {}
    for name in glyph_order:
        pen = TTGlyphPen(glyph_set)
        cu2qu = Cu2QuPen(pen, MAX_ERR * upem / 1000.0, reverse_direction=True)
        glyph_set[name].draw(cu2qu)
        glyf_glyphs[name] = pen.glyph()

    glyf = newTable("glyf")
    glyf.glyphOrder = glyph_order
    glyf.glyphs = glyf_glyphs
    font["glyf"] = glyf

    loca = newTable("loca")
    font["loca"] = loca

    # ---- maxp: CFF에는 없는 TrueType 필드를 직접 채운다 ----
    maxp = font["maxp"]
    maxp.tableVersion = 0x00010000
    maxp.maxZones = 1                      # 이걸 빼면 KeyError: 'maxZones'
    for k in (
        "maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
        "maxStackElements", "maxSizeOfInstructions",
        "maxComponentElements", "maxComponentDepth",
    ):
        setattr(maxp, k, 0)

    # CFF 테이블은 제거한다. 둘 다 있으면 렌더러가 헷갈린다.
    for t in ("CFF ", "VORG"):
        if t in font:
            del font[t]

    font.save(dst)
    print("converted:", dst)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: otf2ttf.py <in.otf> <out.ttf>")
    convert(sys.argv[1], sys.argv[2])
