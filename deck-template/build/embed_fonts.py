#!/usr/bin/env python3
"""
============================================================
embed_fonts.py — PPTX에 한글 폰트를 심는다
------------------------------------------------------------
한글 PPT의 가장 큰 함정. Pretendard 같은 웹폰트는 받는 사람 PC에 없다.
맑은 고딕으로 폴백되면 자간·굵기가 무너져 디자인이 전부 깨진다.

pptxgenjs에는 폰트 임베딩 기능이 없다. 그래서 zip을 열어 직접 넣는다.
건드리는 곳은 네 군데다.

  1) ppt/presentation.xml          embedTrueTypeFonts="1" 로 임베딩 켜기
  2) ppt/presentation.xml          <p:embeddedFontLst> 를 defaultTextStyle 앞에 삽입
  3) ppt/_rels/presentation.xml.rels   폰트 관계 추가
  4) [Content_Types].xml           fntdata 확장자 등록
  + ppt/fonts/font1.fntdata, font2.fntdata 로 TTF 바이트를 그대로 써넣기

rId는 반드시 '기존 최대값 + 1'로 계산한다. 하드코딩하면 슬라이드가 늘어날 때
충돌해서 파일이 열리지 않는다. (실제로 26 -> 28장으로 늘렸을 때 터졌다)

전제: TTF(glyf) 파일이어야 한다. OTF(CFF)는 안 받는다.
      Pretendard 배포본은 OTF이므로 otf2ttf.py 로 먼저 변환한다.

사용:
    python3 build/embed_fonts.py build/out/deck.pptx \\
        --regular /usr/share/fonts/truetype/pretendard/Pretendard-Regular.ttf \\
        --bold    /usr/share/fonts/truetype/pretendard/Pretendard-Bold.ttf \\
        --name    Pretendard
============================================================
"""
import argparse
import os
import re
import shutil
import zipfile

REL_FONT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"


def embed(src, regular, bold, typeface):
    for f in (src, regular, bold):
        if not os.path.exists(f):
            raise SystemExit("파일이 없습니다: " + f)

    tmp = src + ".tmp"
    zin = zipfile.ZipFile(src, "r")
    names = zin.namelist()

    pres = zin.read("ppt/presentation.xml").decode("utf-8")
    rels = zin.read("ppt/_rels/presentation.xml.rels").decode("utf-8")
    ct = zin.read("[Content_Types].xml").decode("utf-8")

    if "embedTrueTypeFonts" in pres:
        raise SystemExit("이미 폰트가 임베딩된 파일입니다. 빌드부터 다시 하세요.")

    # 1) 임베딩 켜기. 서브셋 저장은 끈다(한글은 서브셋이 오히려 문제를 만든다).
    if 'saveSubsetFonts="1"' in pres:
        pres = pres.replace('saveSubsetFonts="1"', 'saveSubsetFonts="0" embedTrueTypeFonts="1"', 1)
    else:
        pres = pres.replace("<p:presentation ", '<p:presentation embedTrueTypeFonts="1" ', 1)

    # 2) rId를 동적으로 계산해 폰트 목록 삽입
    ids = [int(m) for m in re.findall(r'Id="rId(\d+)"', rels)]
    rid_reg, rid_bld = max(ids) + 1, max(ids) + 2
    embed_lst = (
        "<p:embeddedFontLst><p:embeddedFont>"
        '<p:font typeface="{tf}"/>'
        '<p:regular r:id="rId{r}"/><p:bold r:id="rId{b}"/>'
        "</p:embeddedFont></p:embeddedFontLst>"
    ).format(tf=typeface, r=rid_reg, b=rid_bld)

    if "<p:defaultTextStyle>" not in pres:
        raise SystemExit("presentation.xml 구조가 예상과 다릅니다.")
    pres = pres.replace("<p:defaultTextStyle>", embed_lst + "<p:defaultTextStyle>", 1)

    # 3) 관계 추가
    rels = rels.replace(
        "</Relationships>",
        '<Relationship Id="rId{r}" Type="{t}" Target="fonts/font1.fntdata"/>'
        '<Relationship Id="rId{b}" Type="{t}" Target="fonts/font2.fntdata"/>'
        "</Relationships>".format(r=rid_reg, b=rid_bld, t=REL_FONT),
        1,
    )

    # 4) 확장자 등록
    if 'Extension="fntdata"' not in ct:
        ct = ct.replace(
            "</Types>",
            '<Default Extension="fntdata" ContentType="application/x-fontdata"/></Types>',
            1,
        )

    with open(regular, "rb") as f:
        reg_bytes = f.read()
    with open(bold, "rb") as f:
        bld_bytes = f.read()

    zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
    for n in names:
        if n == "ppt/presentation.xml":
            zout.writestr(n, pres)
        elif n == "ppt/_rels/presentation.xml.rels":
            zout.writestr(n, rels)
        elif n == "[Content_Types].xml":
            zout.writestr(n, ct)
        else:
            zout.writestr(n, zin.read(n))
    zout.writestr("ppt/fonts/font1.fntdata", reg_bytes)
    zout.writestr("ppt/fonts/font2.fntdata", bld_bytes)
    zout.close()
    zin.close()

    shutil.move(tmp, src)
    print("embedded {} (rId{}, rId{}) -> {} bytes".format(typeface, rid_reg, rid_bld, os.path.getsize(src)))
    print("zip을 직접 건드렸으니 반드시 검증한다:")
    print("  python3 <pptx skill>/scripts/office/validate.py " + src)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--regular", required=True, help="Regular 굵기 TTF 경로")
    ap.add_argument("--bold", required=True, help="Bold 굵기 TTF 경로")
    ap.add_argument("--name", default="Pretendard", help="build.js의 FONT와 같은 이름")
    a = ap.parse_args()
    embed(a.pptx, a.regular, a.bold, a.name)
