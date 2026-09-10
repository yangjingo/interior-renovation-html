"""Reject common personal identifiers from a distributable example tree."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


TEXT_EXTENSIONS = {".css", ".html", ".js", ".json", ".md", ".svg", ".txt", ".yaml", ".yml"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
EMAIL = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
CN_MOBILE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
DATA_URI = re.compile(r"data:image/[^;]+;base64,[A-Za-z0-9+/=]+")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default="example")
    parser.add_argument("--alias", default="yj")
    parser.add_argument("--forbid", action="append", default=[])
    return parser.parse_args()


def scan_pdf(path: Path, alias: str, errors: list[str]) -> None:
    try:
        import fitz
    except ImportError:
        errors.append(f"{path}: cannot inspect PDF metadata because PyMuPDF is unavailable")
        return
    with fitz.open(path) as document:
        for field in ("author", "creator", "producer"):
            value = (document.metadata.get(field) or "").strip()
            if value and value.casefold() != alias.casefold():
                errors.append(f"{path}: PDF {field} must be blank or {alias!r}")


def scan_image(path: Path, alias: str, errors: list[str]) -> None:
    try:
        from PIL import ExifTags, Image
    except ImportError:
        errors.append(f"{path}: cannot inspect image metadata because Pillow is unavailable")
        return
    with Image.open(path) as image:
        exif = image.getexif()
        if 34853 in exif:
            errors.append(f"{path}: GPS EXIF metadata is not allowed")
        for key, value in exif.items():
            label = ExifTags.TAGS.get(key, str(key)).casefold()
            if label in {"artist", "copyright", "ownername", "cameraownername"}:
                text = str(value).strip()
                if text and text.casefold() != alias.casefold():
                    errors.append(f"{path}: identifying EXIF field {label!r} is not allowed")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"privacy check failed: directory not found: {root}", file=sys.stderr)
        return 2

    home_name = Path.home().name
    forbidden = [value for value in [home_name, *args.forbid] if value and value.casefold() != args.alias.casefold()]
    byte_needles = [b"c:\\users\\", b"file:///c:/users/", b"/users/"]
    byte_needles.extend(value.casefold().encode("utf-8") for value in forbidden)
    errors: list[str] = []

    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        relative = path.relative_to(root)
        relative_folded = str(relative).casefold()
        for value in forbidden:
            if value.casefold() in relative_folded:
                errors.append(f"{relative}: forbidden identifier appears in filename")

        data = path.read_bytes()
        lowered = data.lower()
        for needle in byte_needles:
            if needle in lowered:
                errors.append(f"{relative}: forbidden user path or identifier appears in file bytes")
                break

        if path.suffix.casefold() in TEXT_EXTENSIONS:
            text = DATA_URI.sub("[embedded-image]", data.decode("utf-8", errors="ignore"))
            if EMAIL.search(text):
                errors.append(f"{relative}: email address found")
            if CN_MOBILE.search(text):
                errors.append(f"{relative}: possible mobile number found")
        elif path.suffix.casefold() == ".pdf":
            scan_pdf(path, args.alias, errors)
        elif path.suffix.casefold() in IMAGE_EXTENSIONS:
            scan_image(path, args.alias, errors)

    if errors:
        print("Example privacy check failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"Example privacy check passed: {root}")
    print("Manual visual review is still required for raster watermarks, faces and identifiable exteriors.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
