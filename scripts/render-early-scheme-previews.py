"""Render the three privacy-checked early floor plans as raster previews."""

from pathlib import Path

import fitz
from PIL import Image


root = Path(__file__).resolve().parent.parent
matches = list((root / "example/input").glob("*改2.pdf"))
if len(matches) != 1:
    raise RuntimeError("Expected one local early-scheme PDF")

output = root / "example/work/drawing-evidence"
output.mkdir(parents=True, exist_ok=True)
with fitz.open(matches[0]) as document:
    if len(document) != 3:
        raise RuntimeError("Early-scheme page count changed; inspect before publishing")
    for index, page in enumerate(document, 1):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.8, 1.8), alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        image.thumbnail((1600, 1600))
        target = output / f"floor{index}-previous-scheme-plan.webp"
        image.save(target, "WEBP", quality=82, method=6)
        print(f"{target}: {target.stat().st_size} bytes")
