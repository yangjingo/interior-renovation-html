# Example Working Files

This directory contains the current reviewable HTML and its reproducible intermediate assets for the bundled renovation example.

- `room.html` is the canonical current whole-home deliverable. Refresh it after every accepted HTML, image, 3D, note or release-metadata change, then rerun validation and browser checks.

- Root JSON, YAML, SVG, and `audit/` files record the third-floor evidence and preflight process.
- `assets/` and `renders/` retain the reference and final images used by the checked third-floor fixture.
- `room-renders/` is the single working location for whole-home room renders, compressed HTML assets, floor references, and retained before/after comparisons.
- `room-renders/comparisons/whole-home-v2/` contains only the three historical images still required by the comparison patch.

Blender-native deliverables belong in the sibling `../output-blender/` directory, not beside `room.html` or inside `room-renders/`. Do not create additional top-level temporary-output directories. `assets/example-third-floor/output/` remains the checked single-floor golden fixture; it is not the current whole-home review file and must not overwrite `room.html`.

The current Blender companion is `../output-blender/yj-home-blender-v9-stair-rebuild/`. Its dogleg stair replaces the former generic straight run, and `room.html` now uses the same two-flight relationship in the embedded Three.js model. Review `review-stair/contact-sheet.html` before sharing.

Before sharing this example, run `python scripts/validate-example-privacy.py example` from the skill root and visually inspect every raster source for watermarks, faces and identifiable exterior views.
