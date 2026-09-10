"""Rewrite raster review files without metadata while preserving pixels."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from PIL import Image


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if not root.is_dir():
        raise SystemExit(f"Directory not found: {root}")

    rewritten = 0
    for path in sorted(root.rglob("*")):
        if path.suffix.casefold() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        with Image.open(path) as source:
            image = source.copy()
            image_format = source.format
        temporary = path.with_name(f".{path.name}.sanitized")
        save_options: dict[str, object] = {}
        if image_format == "JPEG":
            save_options.update(quality=95, subsampling=0)
        elif image_format == "WEBP":
            save_options.update(lossless=True, quality=100)
        image.save(temporary, format=image_format, **save_options)
        os.replace(temporary, path)
        rewritten += 1

    print(f"Sanitized metadata from {rewritten} raster files under {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
