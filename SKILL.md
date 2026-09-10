---
name: interior-renovation-html
description: Turn single- or multi-floor CAD-exported residential plan PDFs or clear dimensioned plan images, style references, and living requirements into a checked renovation concept with per-floor plan analysis, room-by-room explanations, door/window visuals, floor-specific Three.js previews and ImageGen renders, materials, budget, sourcing keywords, one downloadable HTML, and optional public review notes. Use for whole-home, multi-storey, selected-floor, room-scope, or shared-review interior planning; do not present the result as structural engineering or construction drawings.
metadata:
  short-description: CAD 户型到交互式装修方案
---

# Interior Renovation HTML

Create one coherent renovation proposal from drawing evidence through visualisation and purchasing. Keep geometry, atmosphere, costs, and safety traceable to different sources.

## Introduction media

Use the original [2D workflow introduction](docs/skill-intro-video/output/2d/floorplan-to-renovation-preview-2d-web.mp4) when explaining inputs, floor-by-floor processing and the complete HTML output. Use the separate [3D feature introduction](docs/skill-intro-video/output/3d/floorplan-to-renovation-preview-3d-web.mp4) when presenting independent floor models, camera movement, floor switching and review interaction. Do not splice the 3D reveal into the 2D master. The 1080p masters, posters and subtitles are separated under `docs/skill-intro-video/output/2d/` and `output/3d/`; storyboards and reproducible Remotion source live in `docs/skill-intro-video/`. `docs/skill-intro-slides.html` remains the accompanying presentation.

## Read in this order

1. Read [references/usage.md](references/usage.md) to understand invocation, expected uploads, and the user-facing hand-off.
2. Read [references/input-contract.md](references/input-contract.md) for every job.
3. Read [references/workflow.md](references/workflow.md) before analysing a plan or producing deliverables.
4. Read [references/data-schemas.md](references/data-schemas.md) when creating the facts table, coordinate baseline, option variants, staging files, or embedded-asset manifest.
5. Read [references/safety-and-validation.md](references/safety-and-validation.md) whenever the request touches walls, doors, windows, balconies, stairs, wet areas, local rules, or budgets. This applies to most full renovation jobs.
6. Read [references/image-and-3d.md](references/image-and-3d.md) when 3D or room renders are requested.
7. Read [references/blender-iterative-workflow.md](references/blender-iterative-workflow.md) when an editable Blender model, GLB, Blender renders, `bpy` automation or later real-time hand-off is requested.
8. Read [references/output-contract.md](references/output-contract.md) before building the final HTML.
9. Read [references/magazine-style-sources.md](references/magazine-style-sources.md) when the HTML uses an editorial, architectural-magazine, catalogue, or broadsheet presentation, or when selecting Amicro-inspired motion.
10. Read [references/public-review-and-notes.md](references/public-review-and-notes.md) when publishing through Vercel or adding anchored design discussion.
11. Read [references/example-third-floor.md](references/example-third-floor.md) when a realistic end-to-end example would help, especially for a selected floor with several balconies.

## Source roles

Never merge these evidence roles:

- **Plan PDF:** geometry, axis dimensions, room adjacency, stairs, doors, windows, balconies, wet stacks, and printed area.
- **Style image or style text:** palette, material character, lighting, furniture language, and desired emotional tone.
- **User requirements:** who lives there, functions, furniture sizes, budget, maintenance tolerance, and what may change.
- **UI or diagram specification:** how the deliverable looks. It cannot establish architectural facts.
- **Generated 3D and renders:** design communication. They are not evidence of structural feasibility.

When sources conflict, the plan controls geometry, the user controls requirements, and a qualified local professional controls structural and regulatory feasibility.

## Frontend reference discipline

When the user asks for a different presentation style, study references for principles rather than copying a finished page or its assets. Use [Inspora](https://www.inspora.design/) to survey broad web, branding, product, motion and 3D directions; [Awwwards](https://www.awwwards.com/) to calibrate layout and interaction quality; [GSAP Showcase](https://gsap.com/showcase/) to understand purposeful motion; [Amicro](https://amicro.vercel.app/) to select focused micro-interaction behaviours; and [Refero Styles](https://styles.refero.design/) plus [getdesign.md](https://getdesign.md/) to translate a named visual direction into project-specific tokens. For magazine-style renovation reports and Amicro adaptation boundaries, apply [references/magazine-style-sources.md](references/magazine-style-sources.md). Keep the user-facing `DESIGN.md` as a practical QA document; store Agent-facing style evidence and adaptation rules under `references/`.

Record the selected direction as project-specific tokens and rules: typography, colour, spacing, image treatment, component rhythm, motion purpose and reduced-motion fallback. Preserve the renovation contract, CAD legibility, per-floor identity, mobile readability and review anchors regardless of visual style. Do not download or reuse third-party artwork, code, fonts or imagery unless its licence and provenance permit the intended delivery.

## Multi-floor identity rule

Treat a multi-floor drawing set as several related plans, not as one layout with different labels. Follow this evidence chain separately for every designed floor:

`floor plan evidence → floor facts → room-by-room explanation → floor baseline → floor-specific 3D/ImageGen → HTML`

Share only verified building-core facts such as stairs, shafts, façade grids, wet stacks and vertical services. Do not copy another floor's room boundaries, openings, furniture layout, camera composition, 3D shell or render and then relabel it. Before visual generation, compare the floors side by side and record the differences in footprint, stair/core position, room count, partitions, doors/windows, balconies, wet areas and primary dimension chains. If two floors are genuinely identical, cite the drawing evidence; otherwise visually similar skeletons are a failed reconstruction.

## Non-negotiable gates

Do not skip these gates:

1. **Inventory inputs.** Identify every file and its role. Ask only for missing information that materially changes the result.
2. **Create the project contract.** After the scope and input roles are known, create `project-config.json` before geometry, visuals, or HTML. Recompute its sanitised input fingerprint whenever the routed-input manifest changes.
3. **Audit and map the complete plan set.** Render and inspect every page, map printed floor labels to source pages, and create a legible plan crop for every designed floor. Do not infer the floor from page order alone, and do not substitute a generated schematic for the source-plan view in the drawing panel.
4. **Create per-floor facts and room ledgers.** For every designed floor, separate `drawing fact`, `design inference`, and `proposal`; then describe every visible room's use, dimensions, adjacency, doors/windows, fixed furniture and unknowns. Never source one floor's room record from another floor's page.
5. **Freeze independent spatial baselines.** Use one versioned baseline per designed floor and one shared building core. Room names, dimensions, openings, wet areas, balconies and circulation must remain consistent across that floor's plan, 3D, renders, budget and furniture schedule.
6. **Plan before rendering.** Decide use, circulation, storage, openings, wet areas, and furniture clearances before starting any enabled Three.js or ImageGen work.
7. **Assess every physical modification.** For each wall, door, or window change, record benefit, risk, prerequisite checks, and a no-demolition alternative.
8. **Record the configured preflight.** Whole-home and selected-floor scopes must cover moisture/mould, demolition hazards, electrical, gas/combustion/CO, smoke/egress/fire, door swings, plumbing/drainage/ventilation, and structure/façade. A room scope may use the applicable configured subset. Mark every entry `clear`, `unknown`, `issue`, or `not_applicable` before calling a scheme ready for development.
9. **Build configured 3D per floor.** When `interactive_3d` or static 3D previews are enabled, rebuild each designed floor from its own baseline using printed dimensions or labelled estimates. A floor-specific top view must visibly match its source plan before perspective views are accepted. Changing only the label or furniture is not a reconstruction. Classify every shared boundary as `solid`, `fully-open`, `door-opening`, or `glazed-partition`; the renderer must consume that classification instead of turning every zone edge into a wall. Snap intended shared coordinates to one canonical line and reject overlaps, near-parallel duplicate walls, or gaps outside the declared tolerance. When `interactive_3d` is enabled, its viewer is a required primary module: never remove it, replace it with static renders or a history carousel, hide or collapse it by default, or place a complete historical-comparison block before it. Show the active floor's 3D viewer immediately after the floor selector; place version-history carousels afterward as supplementary evidence. Skip this artifact cleanly only when both 3D controls are off.
10. **Generate traceable floor-specific visuals.** Every final render must name its `floor_id`, `room_id`, baseline version, camera and matching plan/3D reference. Show each important space as `plan/3D relationship → ImageGen atmosphere`. Any highlighted door/window change needs an existing/proposed visual comparison in the openings panel. A configured special-area panel is incomplete when it contains text cards only: every named kitchen, balcony, wet area, laundry or other highlighted zone must visibly include at least one same-floor plan detail, 3D view or final render. Label unrelated earlier images as style references; never reuse them as another floor's final view. Every user-facing static 3D card must be presentation-ready and marked `data-overview-quality="polished"`. A raw, coarse, white or engineering model may appear only as explicitly labelled supplemental geometry evidence in a collapsed section; it must never be counted or presented as a finished Imagen/render result. When Blender files are requested, start from the already-approved project evidence, then apply [references/blender-iterative-workflow.md](references/blender-iterative-workflow.md): snapshot, rebuild per floor, approve the plan overlay and solid geometry, add furniture/materials/light in stages, and repeat fixed-camera preview → inspect → fix → re-render. Keep bundled example files under `example/output-blender/`; a selected privacy-safe ImageGen output may be packed as a named material/lighting reference, but a complete room render must not be tiled directly onto geometry.
11. **Translate appearance into buildable materials.** Dry, wet, and outdoor areas require different systems even when their appearance is continuous.
12. **Validate the single HTML.** Check scripts, IDs, tab targets, evidence cross-references, responsive layout, placeholders, and every enabled image, budget, interaction, and fallback requirement. For multi-floor work, compare all floor plan/3D/render groups side by side and reject any floor whose geometry cannot be traced to its own drawing. Also reject unequal presentation quality: when one floor has a polished furnished whole-floor bird's-eye preview, another floor's raw grey/white model cannot be its only overall preview. Geometry remains floor-specific, but finish, furnishing completeness, resolution and framing must be comparable across floors. Syntax checks are insufficient for generated or injected JavaScript: a browser runtime check must reach the viewer's ready state and report zero console errors.
13. **Refresh after every mutation.** Treat any change to HTML, JSON evidence, embedded assets, Three.js code, review notes, or release metadata as invalidating the currently displayed output. Re-run the authoritative generator/patch, increment the release ID when the visible result changes, reload with cache bypass, wait for images and 3D readiness, revisit every affected floor/panel/camera, capture a fresh screenshot, and check the console. Never report a code edit as visible before this refresh loop passes. For an already shared public site, restage and hash the checked file, deploy a new release, rebind the approved stable alias, and recheck project protection before returning the refreshed URL.
14. **Prepare public review safely.** When `features.review_notes` is enabled, add a design-matched draggable review orb, stable DOM/image/3D anchors, explicit local-versus-shared storage wording, append-only note history, and complete JSON/Markdown/CSV export. Stage only the checked HTML and approved public assets. Verify staged hashes and plan-image coverage before using the `vercel-deploy` skill; never upload raw private drawings merely to fix a missing image. Before calling a Vercel link public, inspect the named project's protection state. A working production alias is still inaccessible to an unauthenticated phone when `ssoProtection` is enabled. Disable SSO only when the user explicitly authorises public access, change only the named project, and verify the protection state again before hand-off.

## Default design stance

For a large, comfortable minimalist interior:

- Enlarge only one or two high-value connections instead of glazing every wall.
- Preserve a continuous public axis and at least one complete wall for storage, projection, or art.
- Keep furniture low, sparse, and dimensionally credible; leave the main circulation visually empty.
- Use warm wood, textiles, and layered warm light to soften concrete or mineral finishes.
- Concentrate storage rather than scattering small cabinets.
- Let minimalism reduce objects, not waterproofing, drainage, acoustic comfort, ventilation, maintenance access, or safety.

## Tool and artifact policy

- Use PDF inspection and page rendering for plan evidence.
- Use image generation for new room visualisations when `minimum_visuals.final_renders > 0`; treat an uploaded style photo as reference unless the user explicitly asks to edit that photo.
- When `features.interactive_3d` is true, use native Three.js geometry for the interactive model and provide the configured embedded static 3D previews as offline fallback. Do not leave an import map or 3D controls when the feature is off.
- Compress project images to WebP and embed them in the final HTML. A pinned Three.js CDN is acceptable by default; fully inline dependencies only when the user asks for completely offline 3D.
- Use [scripts/embed-images.mjs](scripts/embed-images.mjs) for deterministic data-URI injection when an asset manifest is available.
- Run [scripts/validate-renovation-html.mjs](scripts/validate-renovation-html.mjs) on the final HTML.
- After every visible mutation, force-refresh the actual delivery surface and run the affected-floor browser check; `node --check` and a successful file write do not prove runtime symbols, WebGL state, or rendered assets are correct.
- For public review, read [references/public-review-and-notes.md](references/public-review-and-notes.md), then use the installed `vercel-deploy` skill. Default to an explicit Preview target; require user authorisation for a stable production alias or deletion of an earlier deployment.

## Stop conditions

Stop short of a construction conclusion when any of these remain unknown:

- A proposed opening may affect a load-bearing wall, shear wall, beam, column, ring beam, lintel, balcony connection, or fire separation.
- Exterior-window changes may require planning, façade, strata, property-management, or local authority approval.
- A wet-area move lacks verified drainage elevation, stack position, waterproof detail, or ventilation.
- The drawing is unreadable or lacks a reliable scale/dimension chain, yet exact measurements are requested.

Continue with a labelled concept and a safe fallback, but state what must be checked by an architect, structural engineer, MEP designer, contractor, property manager, or local authority.

## Final deliverable

Default to one responsive, downloadable HTML containing the plan, proposal, interactive 3D, static 3D previews, final renders, materials, budget, and sourcing guidance. For the bundled working example, write the current complete deliverable to `example/output-html/room.html`; put editable Blender/GLB outputs and their manifests in `example/output-blender/`. Treat both as review artifacts, not input or render caches. A distributable example must contain no real name, address, account ID, contact detail, face, identifiable exterior, absolute user path or private metadata; use the neutral alias `yj` everywhere an example identity is necessary. When review mode is enabled, include anchored notes, history and export without weakening any plan/3D requirement. Preserve original private inputs outside the distributable example; never disguise the output as a stamped drawing, engineering assessment, or quotation.
