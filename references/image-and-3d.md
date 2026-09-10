# 3D and final-render protocol

Use the same frozen spatial baseline for every enabled Three.js view, static preview and ImageGen prompt. `projectConfig` controls them independently: a live model is required only when `features.interactive_3d` is true, while static previews and final renders are required only up to their non-zero `minimum_visuals` counts.

For multi-floor work, repeat the complete chain for each floor: `source plan crop → room ledger → floor baseline → white model/static 3D → final render`. Style may be shared; geometry may not. Never create floor 1 or floor 2 by relabelling floor 3, moving a few loose items or repainting the same shell.

## Floor-specific geometry lock

Before generating atmospheric images, lock these items for every designed floor:

- Source page ID and embedded plan-crop asset ID.
- Baseline version, preferred variant and overall bounds.
- Stair/core anchor, room boundaries and adjacency graph.
- Door/window wall, position, width and opening type.
- Fixed furniture dimensions and orientation.
- Named camera IDs with position and look direction.

Export a same-orientation orthographic/top view and compare it beside the source plan. The model fails if the drawing has different partitions, openings or balcony relationships but the generated floor differs only in labels, materials or furniture. Record the comparison in `visual-correspondence.json` before producing final renders.

## Three.js model

Apply this section when `features.interactive_3d` is true. When it is false, omit the module, import map, canvas controls and network allowance.

### Minimum geometry

- Use the drawing's printed overall dimensions and axis chains.
- Model each room/zone as a named bounding region.
- Include exterior/internal walls, doors, windows, balconies, stairs and wet zones.
- Show proposed openings as proposals, not existing facts.
- Include only furniture that helps judge scale and circulation.

### Default interactions

- Orbit, pan and zoom.
- Bird's-eye and orthographic top views.
- At least one public-axis and one private/wet-zone view.
- Wall visibility toggle.
- Day/night lighting toggle when lighting design matters.
- PNG snapshot.
- Responsive resize after the HTML tab becomes visible.

Keep the model procedural and lightweight. Avoid decorative geometry that makes the plan harder to read.

### Boundary topology gate

Do not derive walls from room rectangles alone. Before rendering, resolve every touching zone pair into one canonical boundary record with one treatment: `solid`, `fully-open`, `door-opening`, or `glazed-partition`. Snap both zones to the same shared coordinate within the declared modelling tolerance. Reject a model when two intended neighbours overlap, leave an unintended sliver, or generate two near-parallel wall lines.

For an open relationship, omit the wall geometry instead of drawing a low wall. For a glazed partition, remove the opaque wall and render the actual transparent panels, frames and declared operable opening. The top view must make these treatments distinguishable. Compare the resulting adjacency graph with the user's confirmed relationship statement, not only with room labels.

### Static fallback

Apply this section when `minimum_visuals.static_3d > 0`. Export at least the configured count from the same coordinate model. For a typical whole-floor project, use these three default views:

1. Whole-floor bird's-eye.
2. Main public/opening axis.
3. Private or technically important wet-area axis.

Embed the configured images in the HTML. If a live Three.js module or CDN is enabled and fails, explain that the interactive view needs a network connection and keep the static previews visible.

For a multi-floor deliverable, export at least one legible top/orthographic view per designed floor, even when the configured project-wide static count is lower. Give each file and camera a floor-prefixed ID. A stacked overview is supplementary and does not replace the individual floor views.

Keep the user-facing whole-floor previews at comparable fidelity. If any floor is shown as a polished, furnished, materialised dollhouse/bird's-eye render, every other designed floor needs its own polished overall view at the same approximate resolution, framing completeness, furnishing density and finish quality. A raw grey/white model may remain as geometry evidence, but it cannot be the only image under that floor's “space relationship / 3D preview” heading. Match quality from another floor, never its topology.

Classify each visible static card before embedding it. Finished ImageGen or presentation-ready renders use `data-overview-quality="polished"`. Raw/coarse/white models use `data-geometry-evidence="supplemental"`, remain clearly labelled and collapsed, and are excluded from finished-render counts. If the user asks to remove rough 3D, remove the card plus its embedded asset, provenance and correspondence records; then recompute configured counts rather than leaving stale hidden payloads.

## ImageGen render prompt

When the image tool accepts reference images, use two distinct references where possible:

1. The matching static 3D view when one was produced—or otherwise the relevant plan crop—to anchor camera direction, openings, adjacency, and furniture placement.
2. The uploaded style image, to guide palette, material roughness, lighting, and density.

State each reference's role in the prompt. A visually attractive output still fails if it contradicts the frozen baseline.

For multi-floor work, the composition reference must come from the same `floor_id` and baseline version as the output. A style image may be reused across floors, but a plan crop, white model, static 3D or prior render from another floor cannot anchor composition.

Build one prompt per view from this structure:

```text
Output: photorealistic interior design visualisation, [aspect ratio].
Space: [room name], approximately [dimensions], connected to [adjacent space].
Camera: [position], looking [direction], [lens/perspective].
Geometry: [wall/opening/window/balcony facts and proposed opening label].
Furniture: [items with dimensions and placement].
Materials: [floor, wall, ceiling, joinery, metal, textiles].
Light: [daylight direction], [artificial colour temperature], layered and low-glare.
Mood: [short style synthesis].
Practical details: [drainage, ventilation, cabling, waterproof surface, clearances].
Exclude: [wrong room types, unwanted furniture, text, people, logos, unsafe details].
```

### Reference-image use

- Use a reference photo for atmosphere, material roughness, palette, daylight and furniture density.
- Generate a new independent room unless the user asks to edit the uploaded photo.
- Do not copy a watermark or claim the reference room is the user's room.
- Derive geometry from the plan, not from the style image.
- Do not embed the raw reference photo in the final deliverable by default; check rights, privacy, and user intent first.

### Consistency sheet

Lock these across a set:

- Concrete/mineral warmth and sheen.
- Wood tone.
- Metal colour.
- Textile family.
- Window-frame colour and thickness.
- Daylight direction.
- Artificial-light temperatures by room type.
- The same opening width and adjacent-space function.

Keep this sheet consistent within the home, but do not let style consistency erase floor identity. Also keep a floor-difference sheet listing the unique outline, core location, room graph, openings, balcony/wet-area relationships and camera views that must remain visibly distinct.

### Functional negative constraints

State what must not appear. Examples:

- A third-floor family lounge must not gain a kitchen or dining island unless the plan includes one.
- A mattress-only bedroom must not gain a conventional bed frame or large headboard.
- A work room must show a credible sit-stand frame, cable control and the specified desk size.
- A wet-area render must not show untreated self-levelling cement in the shower.
- A balcony must retain drainage, threshold and fall protection.

## Pairing in the HTML

For each important zone, place only the asset types enabled by `projectConfig`:

1. A short decision statement.
2. The matching 3D relationship view when configured.
3. One or two final renders when configured.
4. A note identifying drawing facts versus proposed changes.

When the HTML includes a special-area/重点区域 panel, repeat or derive at least one same-floor visual for every named special area. Text-only kitchen, balcony, wet-area or laundry cards fail the visual hand-off even when the same image exists elsewhere in the 3D/render gallery. Bind the visible special-area image to its asset/provenance and visual-correspondence record; do not rely on the user to find it in another tab.

Earlier renders from a different floor plan may be included only under a collapsed `style reference` gallery. Do not label them as final views of the current plan.

For every highlighted door/window modification, create an existing/proposed pair using the same floor, room, camera and surrounding geometry. At least one member must make the changed opening visually legible as a 3D or plan-faithful effect view; a text-only option card does not satisfy the visual requirement.

## Visual review gate

Before accepting a render, check:

- Floor ID, source page and baseline version all match.
- Camera direction matches the intended wall and opening.
- Adjacent room is correct.
- Furniture count, size and orientation are plausible.
- Circulation remains open.
- Doors, windows and balcony rails are not invented or missing.
- Materials are appropriate to dry, wet or exterior exposure.
- The image contains no accidental text, watermark, logo or person unless requested.
- The set feels like one home.

Then place all designed floors in one comparison contact sheet. Reject a floor when its plan says the skeleton differs but its 3D/render preserves another floor's outline, wall positions, openings or camera composition. Similar materials are desirable; unexplained geometric sameness is not.

In the same contact sheet, compare presentation quality. Reject a set where some floors have finished, furnished whole-floor renders while another floor shows only an empty or raw grey model. Confirm each special-area card contains a decoded visible image rather than only a title and paragraph.

Regenerate or edit any image that fails these checks. Do not explain away a visible contradiction in the caption.

## Blender working deliverables

For native modelling, staged material/light refinement and the mandatory fixed-camera self-review loop, follow [blender-iterative-workflow.md](blender-iterative-workflow.md). Its entry point is the approved project evidence and floor baselines, not a new free-form concept prompt.

When editable Blender output is requested for the bundled example, keep it in `example/output-blender/`, separate from `example/output-html/room.html` and `example/output-html/room-renders/`. Store the `.blend`, exchange `.glb`, artifact manifest, PBR source manifest, preview contact sheet, iteration review log and a short README together. Use only relative paths, pack required textures, set author/project metadata to `yj`, and scan the saved native files for workstation usernames or absolute paths.

A privacy-safe ImageGen image may be included under `example/output-blender/references/imagen/` and packed into the `.blend` as a named material, lighting and mood reference. Record its prompt role and hash in the manifest. Translate its visible plaster roughness, wood tone, textile response and daylight into Blender material parameters; do not connect the complete room image as a repeating surface texture. Exported GLB remains self-contained and must not depend on a temporary ImageGen URL or a file outside `output-blender/`.

## Post-mutation refresh gate

After every change to geometry, assets, injected scripts, controls or captions:

1. Rebuild the HTML from the authoritative source or run the idempotent patch again.
2. Run static validation and extract each generated module for syntax checking.
3. Open or reload the actual HTML with cache bypass and wait until the Three.js viewer reaches its ready state.
4. Switch to each affected floor, use the same top and axis camera presets, and capture fresh screenshots.
5. Confirm expected open/glazed/solid boundaries visually, confirm removed assets are absent from the DOM and embedded manifest, and require zero browser console errors.
6. If the page already has an authorised public URL, create a new release, restage/hash/deploy it, refresh the stable alias, and return that refreshed URL.

A passing syntax check does not catch a runtime-scoping mistake such as a helper parsed as an isolated function expression. Do not claim the output is updated until the browser-rendered result passes this gate.
