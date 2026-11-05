"""Build the site's WebP images from the PNG/JPG sources in assets/img (originals stay as sources).

The source art is small (hero 660px wide, cards 225px) but is shown much larger, so each image is
upscaled with Lanczos resampling and a light unsharp mask before encoding. That reads crisper than the
browser's own stretching. It can't invent detail: for a truly sharp result, replace the sources with
higher-resolution photos and re-run (use SCALE = 1 for images that are already large enough).

Usage:  python scripts/optimize-images.py
Requires Pillow (pip install pillow).
"""
from pathlib import Path
from PIL import Image, ImageFilter

SRC = Path(__file__).resolve().parent.parent / "assets" / "img"
# Not referenced by the app; skipped so they don't bloat the deploy.
SKIP = {"living-room-hero.png", "service-cards-pick-compare-book.png"}
# Upscale factor by file stem; anything not listed gets DEFAULT_SCALE.
SCALE = {"hero": 3, "market": 3, "card-1": 3, "card-2": 3, "card-3": 3}
DEFAULT_SCALE = 2
QUALITY = 88
SHARPEN = ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2)


def upscale(im: Image.Image, factor: float) -> Image.Image:
    size = (round(im.width * factor), round(im.height * factor))
    if im.mode == "RGBA":
        # Sharpen colour only; resample alpha on its own so edges stay clean.
        rgb = im.convert("RGB").resize(size, Image.LANCZOS).filter(SHARPEN)
        alpha = im.getchannel("A").resize(size, Image.LANCZOS)
        rgb.putalpha(alpha)
        return rgb
    return im.convert("RGB").resize(size, Image.LANCZOS).filter(SHARPEN)


total_before = total_after = 0
for path in sorted(SRC.iterdir()):
    if path.suffix.lower() not in {".png", ".jpg", ".jpeg"} or path.name in SKIP:
        continue
    out = path.with_suffix(".webp")
    with Image.open(path) as im:
        result = upscale(im, SCALE.get(path.stem, DEFAULT_SCALE))
        result.save(out, "WEBP", quality=QUALITY, method=6)
        dims = f"{im.width}x{im.height} -> {result.width}x{result.height}"
    before, after = path.stat().st_size, out.stat().st_size
    total_before += before
    total_after += after
    print(f"{path.name:36s} {dims:20s} {before // 1024:4d} KB -> {after // 1024:4d} KB")

print(f"total {total_before // 1024} KB -> {total_after // 1024} KB")
