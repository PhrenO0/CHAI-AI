# ============================================================
# sheet.py — 렌더한 장들을 컨택트 시트 한 장으로 묶는다
# ------------------------------------------------------------
# 29장을 한 장씩 열어보면 지친다. 3x3으로 붙여 한 번에 훑는다.
# ImageMagick이 없어도 PIL만으로 된다.
#
#   python3 build/qa/sheet.py build/qa/out 3 3
# ============================================================
import glob, sys, os
from PIL import Image

d = sys.argv[1] if len(sys.argv) > 1 else "build/qa/out"
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 3
rows = int(sys.argv[3]) if len(sys.argv) > 3 else 3
scale = float(os.environ.get("SCALE", "0.44"))

files = sorted(glob.glob(os.path.join(d, "*.jpg"))) or sorted(glob.glob(os.path.join(d, "*.png")))
if not files:
    sys.exit("no images in " + d)

per = cols * rows
for page in range((len(files) + per - 1) // per):
    chunk = files[page * per:(page + 1) * per]
    ims = [Image.open(f).convert("RGB") for f in chunk]
    w, h = ims[0].size
    tw, th = int(w * scale), int(h * scale)
    pad = 7
    sheet = Image.new("RGB", (cols * tw + pad * (cols + 1), rows * th + pad * (rows + 1)), "white")
    for i, im in enumerate(ims):
        r, c = divmod(i, cols)
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (pad + c * (tw + pad), pad + r * (th + pad)))
    out = os.path.join(d, f"sheet-{page + 1}.png")
    sheet.save(out)
    print("->", out, f"({len(chunk)} slides)")
