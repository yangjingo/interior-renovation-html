# Floor Plan to Renovation Preview

<p align="center">
  <a href="docs/skill-intro-slides.html">
    <img src="docs/skill-intro-video/output/2d/floorplan-to-renovation-preview-2d-poster.png" alt="From floor-plan evidence to a renovation preview" width="100%" />
  </a>
</p>

<p align="center"><strong>Floor-specific drawings + DESIGN Q&amp;A + style references → traceable 3D, room renders, and a single-file HTML report</strong></p>

<p align="center">
  <a href="README.zh-CN.md">中文</a> ·
  <a href="SKILL.md">Skill Guide</a> ·
  <a href="docs/skill-intro-slides.html">Interactive Slides</a> ·
  <a href="example/output-html/room.html">Bundled Example</a> ·
  <a href="templates/DESIGN.template.md">DESIGN Q&amp;A Template</a>
</p>

## What It Solves

This skill turns CAD-exported residential plans, household requirements, and style references into a renovation concept that can be reviewed and traced back to evidence. A multi-floor home is never treated as one model with renamed tabs: every floor must have its own drawing facts, room ledger, spatial baseline, 3D inspection, and room renders.

## Usage Boundary

The output supports spatial discussion and concept decisions. It does not replace site measurement, structural calculations, fire or permit documents, MEP design, construction drawings, or contractor quotations. Changes involving load-bearing walls, exterior windows, stairs, kitchen or bathroom relocation, waterproofing, or gas systems must retain explicit conditions and be reviewed by qualified local professionals.

The public repository contains a reusable example, not the latest private client revision. New source drawings, room review reports, and project render work remain local. The current local project uses separate design-preview, construction-drawing-review, and floor-specific circulation pages; only the checked, privacy-reviewed delivery is staged for Vercel. For revised structural and MEP sheets, use the [drawing change review](references/drawing-change-review.md) before updating a client deliverable.
An [anonymized revision note](docs/anonymized-design-revision.md) records the recent concept changes without publishing source plans.
The [anonymized circulation scenarios](docs/anonymized-circulation-scenarios.md) cover arrival, meals, bathrooms, work, cleaning and night travel on all three floors without private plans or renders.

| Input object | What it determines | Suggested file |
| --- | --- | --- |
| Floor-specific drawings | Walls, openings, stairs, dimensions, and room relationships | `input/plan.pdf` |
| Household Q&amp;A | Use cases, furniture sizes, budget, restrictions, and unknowns | `input/DESIGN.md` |
| Style reference | Palette, materials, lighting, and furniture language | `input/style-reference.png` |

## From Evidence to Delivery

The workflow has four stages: read each drawing and the Q&amp;A, freeze an independent baseline for every floor, generate aligned 3D and room visuals, then validate and deliver a responsive HTML report.

<table>
  <tr>
    <td width="50%">
      <a href="docs/skill-intro-video/output/2d/floorplan-to-renovation-preview-2d-web.mp4">
        <img src="docs/skill-intro-video/output/2d/floorplan-to-renovation-preview-2d-readme.gif" alt="Autoplaying 2D workflow preview; click for MP4" width="100%" />
      </a>
      <br /><strong>01 · Read drawings and establish baselines</strong><br />Separate drawing facts, requirements, inferences, and unresolved items.
    </td>
    <td width="50%">
      <a href="docs/skill-intro-video/output/3d/floorplan-to-renovation-preview-3d-web.mp4">
        <img src="docs/skill-intro-video/output/3d/floorplan-to-renovation-preview-3d-readme.gif" alt="Autoplaying floor-specific 3D preview; click for MP4" width="100%" />
      </a>
      <br /><strong>02 · Model independently and deliver for the web</strong><br />Produce editable Blender, web GLB, room renders, and final HTML.
    </td>
  </tr>
</table>

The GIF previews autoplay on GitHub; click either preview for its higher-quality MP4. The [interactive Slides](docs/skill-intro-slides.html) retain native embedded video players.

The single-file validator needs `sharp` to decode embedded images fully; install it in the active Node environment or provide it through `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. The V31 commands below also require the private source packages and the local `yj-home` Vercel project binding, so they cannot run from a public clone alone.

## Quick Start

1. Put `plan.pdf`, `style-reference.png`, and the completed [`DESIGN.md`](templates/DESIGN.template.md) in one `input/` directory.
2. Invoke `$interior-renovation-html` and state whether the deliverable needs 3D, room renders, budget guidance, or a public preview.
3. Review floor switching, drawings, 3D, images, anchored notes, and the mobile layout in a browser.

```powershell
# Validate a real deliverable
node scripts/validate-renovation-html.mjs path/to/result.html

# Check the public golden fixture against the single-file contract
node scripts/validate-renovation-html.mjs --allow-golden-example assets/example-third-floor/output/example-third-floor-renovation.html

# Check the current private three-floor project after its source files are available
# Set actual accepted versions in the importer before a new import.
python scripts/import-preview-packages.py
node scripts/build-packaged-preview.mjs
python scripts/check-current-project-assets.py
node scripts/stage-yj-home.mjs

# Serve the editable Blender companion preview
python -m http.server 8767 --directory example/output-blender/yj-home-blender-v9-stair-rebuild
```

## Repository Map

- [`SKILL.md`](SKILL.md): workflow, constraints, and required reading order.
- [`references/`](references/): input, data, 3D, material, safety, and output contracts.
- [`scripts/`](scripts/): embedding, validation, Blender, and publishing utilities.
- [`example/README.md`](example/README.md): professional project terminology, directory roles, and naming exceptions.
- `example/work/room-renders/floorN/vNN/`: accepted whole-floor renders and version records; the render workspace has exactly three top-level floor directories.
- `example/work/circulation-design/`: floor-specific circulation analysis sources. `example/work/drawing-evidence/`: CAD plans, source-sheet extracts, and review-sheet extracts. These private working directories are not shipped in the public repository.
- [`example/output-html/room.html`](example/output-html/room.html): bundled design-preview snapshot. The current local split presentation also has a separate drawing-review page and three circulation companion pages; the private pages are not published in GitHub.
- [`example/output-blender/`](example/output-blender/): editable `.blend`, GLB, and per-floor inspection images.
- [`docs/`](docs/): Slides, 2D/3D videos, storyboards, and launch assets.
