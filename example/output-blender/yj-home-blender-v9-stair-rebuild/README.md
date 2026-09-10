# yj Home Blender v9 — Stair Rebuild

This iteration corrects the stair geometry from the three floor plans. The former straight-run stair has been replaced by a dogleg stair with two parallel flights, an east half-landing, a central well, continuous inner handrails, and a guarded third-floor arrival.

The editable source is `yj-three-floor-renovation-v9.blend`. Use `yj-three-floor-renovation-v9.glb` for exchange and `yj-three-floor-renovation-v9-web.glb` for the web viewer. Open `interactive-preview.html` directly, or serve `interactive-preview-hosted.html` and the web GLB over HTTP.

```powershell
python -m http.server 8767 --directory example/output-blender/yj-home-blender-v9-stair-rebuild
```

Then open `http://127.0.0.1:8767/interactive-preview-hosted.html`. The viewer still requires network access to the pinned Three.js modules.

Review evidence is under `review-stair/`. Start with `contact-sheet.html`, then inspect each floor's plan crop, clay top view, material top view, and stair perspective. `stair-baseline-v1.json` separates drawing facts from concept assumptions.

The stair dimensions remain conceptual: finished floor heights, tread/riser dimensions, headroom, structure, guards, and code compliance must be checked on site by qualified professionals.
