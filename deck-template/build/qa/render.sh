#!/usr/bin/env bash
# ============================================================
# render.sh — PPTX를 실제로 렌더해서 눈으로 확인한다
# ------------------------------------------------------------
# HTML에서 통과했다고 PPTX가 통과하는 게 아니다. 이 단계를 건너뛰면 반드시 겹친다.
#
# 함정 두 개:
#   1) libreoffice 코어만 깔려 있으면 impress 필터가 없어서 전부 실패한다
#      → apt-get install -y libreoffice-impress poppler-utils
#   2) 한글 파일명을 그대로 주면 "source file could not be loaded"가 뜬다
#      → ASCII 이름으로 복사해서 변환한다 (아래에서 처리)
#
# 사용:
#   bash build/qa/render.sh out/deck.pptx        # 전체
#   bash build/qa/render.sh out/deck.pptx 16 16  # 16장만
# ============================================================
set -euo pipefail
SRC="${1:?usage: render.sh <pptx> [firstPage] [lastPage]}"
FIRST="${2:-}"
LAST="${3:-}"

WORK="$(mktemp -d)"
cp "$SRC" "$WORK/deck.pptx"          # ASCII 파일명으로 복사
rm -rf ~/.config/libreoffice          # 프로필 꼬임 방지
cd "$WORK"

soffice --headless --convert-to pdf --outdir . deck.pptx >/dev/null

if [ -n "$FIRST" ]; then
  pdftoppm -jpeg -r 96 -f "$FIRST" -l "${LAST:-$FIRST}" deck.pdf s
else
  pdftoppm -jpeg -r 96 deck.pdf s
fi

OUT="$(cd - >/dev/null && pwd)/build/qa/out"
mkdir -p "$OUT"
cp "$WORK"/s-*.jpg "$OUT"/ 2>/dev/null || cp "$WORK"/s*.jpg "$OUT"/
echo "rendered -> $OUT"
ls "$OUT" | tail -5
