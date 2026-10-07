# YJ Home presentation

The current release is V31. Its two pages have separate roles:

- `room.html` (also staged as `index.html`) shows the three user-supplied whole-floor previews. Each floor embeds its own interactive circulation page, `floorN-circulation.html`, below the overview.
- `room-review.html` holds the architectural, structural, water and electrical drawing review, with the five original drawing-set entries. Original PDFs remain local in `../input/` and are not staged.

The three source ZIP packages are archived unchanged in `../input/archives/`. That private directory is gitignored; see its `archive-manifest.json` for filenames, checksums and sizes. The current whole-floor renders live under `../work/room-renders/floorN/v<version>/` as `floorN-overall-render-vNN.png`, with `version.json` keeping the current and immediately preceding accepted overview for each floor. The three circulation analysis HTML sources live in `../work/circulation-design/`. CAD plans, source-sheet extracts, review-sheet extracts and their provenance stay in `../work/drawing-evidence/` for local review and regeneration. See [../README.md](../README.md) for the full project terminology index.

## Update workflow

1. Place a new source package in the private `../input/archives/` directory. Keep its original filename and update the archive manifest after verifying the ZIP entries and SHA-256.
2. Import accepted images and the matching circulation design HTML with `python scripts/import-preview-packages.py` after setting their actual accepted versions in that script. The importer applies `scripts/circulation-theme-floor12.css` or `scripts/circulation-theme-floor3.css` to the archived HTML; the ZIPs stay unchanged. Do not create a version for an unchanged image.
3. Run `python scripts/check-current-project-assets.py`, then `node scripts/build-packaged-preview.mjs`. Check the three floor tabs, overview images, circulation scenes, hash navigation, mobile layout and browser console.
4. Run `node scripts/stage-yj-home.mjs`. It checks the split pages and stages only the current preview, review and three circulation pages with a release manifest.

The V24 whole-page backups and V29 PDF/image inspection intermediates were removed from `../work/` after checking current references. The earlier [cleanup manifest](cleanup-manifest.json) remains a historical record of its own execution; the new cleanup has a separate inventory.
Older one-time V24/V29 generator scripts may still refer to those removed intermediates; use the V31 commands above for the current preview.

The renders and circulation routes communicate design intent. Openings, structure, services, dimensions and garden load still require revised drawings and site confirmation.
