# Mandatory workflow

This is the full end-to-end sequence. A small room-only task may omit irrelevant sections, but plan evidence, dimensional consistency, safety labelling, and validation remain mandatory. `project-config.json` controls optional artifacts: skip live 3D when `interactive_3d` is false, skip each visual class whose configured minimum is zero, skip budget controls when `budget` is false, and skip purchasing controls when `sourcing` is false. Do not leave disabled-feature UI, data rows, dependencies, or placeholder tabs in the HTML.

## Phase 1 — Inventory and scope

1. List every plan, image, brief and style document.
2. Assign each file one role from the input contract.
3. Confirm the target floor or rooms.
4. Record exact user constraints and reasonable defaults.
5. Ask a question only when the answer would materially change geometry, safety, cost, or deliverable format.
6. Create `project-config.json` from the resolved scope, feature set, target, panels, preflight profile and locale. Hash the sanitised routed-input manifest; recompute the fingerprint if that manifest changes.

**Gate:** one concise scope statement and one internally consistent project contract exist before design begins.

## Phase 2 — Audit the full drawing set

1. Inspect PDF metadata and page count.
2. Extract text and render every page at useful resolution.
   - If extraction returns little or no text, use OCR and visual transcription from the rendered page.
   - Store critical OCR/manual readings with page, region, confidence, and a site-measure flag.
3. Identify each floor by its printed label and create `floor-page-map.json`; never assume page 1 means floor 1.
4. Create one legible, cropped source-plan asset per designed floor. Preserve the complete floor geometry while removing unrelated title-block or personal information where practical.
5. Inspect adjacent floors for stair, shaft, façade and wet-stack continuity.
6. Build a floor-difference matrix covering footprint, orientation, stair/core position, room count and labels, partitions, doors/windows, balconies, wet areas and primary dimension chains.
7. Focus detailed extraction on every designed floor, one floor at a time.

**Gate:** every designed floor has a verified source page, a visible plan crop and at least one recorded identity difference from the other floors. If plans are genuinely identical, cite the matching drawing evidence instead of assuming sameness.

## Phase 3 — Build the plan-facts table

Record:

- Overall axis width/depth and dimension chains.
- Printed gross area versus estimated usable area.
- Rooms and approximate dimensions.
- Adjacency and circulation.
- Doors, windows, balconies, stairs and wet areas.
- Columns, beams, thick walls, shafts and other uncertain structural elements.

For multi-floor work, create a separate fact set and user-facing room ledger for every designed floor. The room ledger covers every visible room or named zone and records:

- Floor and room IDs, printed label and proposed use.
- Approximate dimensions with fact/inference status and source IDs.
- Adjacent rooms, arrival route and main circulation.
- Existing doors, windows, balconies and fixed service points.
- Fixed or requested furniture sizes and placement constraints.
- The short design explanation, unresolved facts and site-measure items.

This is the content source for the HTML's room-by-room section; it is not optional prose added after the images.

Classify every entry:

| Class | Meaning |
| --- | --- |
| Drawing fact | Directly printed or unambiguous on the drawing |
| Design inference | Derived from dimension chains or adjacency; explain the derivation |
| Proposal | New use, opening, partition, fixture or furniture choice |

**Gate:** cross-check `that floor's source plan → that floor's facts/room ledger → that floor's coordinate model` at least once. Every visible room has one ledger record, and no record cites another floor's source page. Recalculate continuous dimension chains; a segment label is not automatically a room dimension.

## Phase 4 — Freeze the spatial baseline

Create one canonical baseline containing:

- Coordinate origin and plan orientation.
- Each zone's bounding dimensions.
- Shared boundaries and openings.
- Wet and outdoor classification.
- Main circulation and minimum clearances.
- Fixed user furniture.
- Verified ceiling/beam/sill/head heights, or an explicit set of vertically conceptual assumptions requiring site measurement.
- Unresolved conditions.

All downstream work reads from this baseline. Keep the **existing drawing state** immutable. Store each adjustment as a proposal delta such as `option-a` or `option-b`, then mark exactly one state as `preferred_for_visualisation`. If a later correction changes the drawing baseline, increment its version and update 3D, render prompts, budget, furniture list and HTML together.

For a deliverable that designs more than one floor, create one building-core record for stairs, shafts, façade grid, main wet stacks and vertical services, plus a separate versioned baseline for each designed floor. Cross-check vertical alignment before designing any floor independently. Copy only those verified core records between floors. Reconstruct zones, boundaries, openings, furniture and circulation from each floor's own evidence. Record a floor identity signature from the source page, outline, core anchor, zone IDs, opening IDs and dimension-source IDs so accidental cross-floor cloning is easy to detect. `features.multi_floor` describes the design scope, not the number of pages in the PDF or storeys in the building: a selected third-floor design from a three-storey plan remains a single-floor deliverable, although adjacent floors still need an audit for continuity.

**Gate:** do not start ImageGen while the baseline is still contradictory.

If the user has not stated what may move, the default variant must preserve every wall, opening, exterior window, wet stack and fixed service. If vertical dimensions are absent, the 3D may remain plan-faithful in plan only; show the assumed wall, sill, head and door/glazed-divider heights in the HTML and never imply they came from the drawing.

## Phase 5 — Plan the living experience

Decide in this order:

1. Daylight, views, cross-ventilation and noise. If orientation, view or noise evidence is missing, optimise only observable opening relationships and label solar/view claims as unknown.
2. Stair/entry arrival and uninterrupted circulation.
3. Public, work, guest and private zones.
4. Balcony roles.
5. Wet stacks and service access.
6. Storage concentration, acoustics and night lighting.
7. Furniture dimensions and maintenance clearances.

For comfortable minimalism, select a small number of decisive changes. Keep the centre of the main room open; place low furniture at edges; preserve a complete wall; avoid decorative partitions that reduce usable space.

## Phase 6 — Evaluate modifications

For every proposed wall, door or window change, write:

- Existing condition.
- Proposed size and opening type.
- Spatial benefit.
- `risk_level`: low, medium, high or unknown, plus a separate plain-language risk explanation.
- Required drawings, inspection and approvals.
- Drainage, waterproofing, fall-protection, curtain, HVAC and furniture conflicts.
- A fallback that keeps the existing opening.

For every highlighted door/window decision, also define a matched visual pair: same floor, same room, same camera and surrounding geometry, with one existing view and one proposed view. A plan enlargement may explain dimensions, but the openings page still needs a 3D or plan-faithful effect view that makes the spatial consequence visible.

Do not convert a concept opening into a construction instruction.

## Phase 7 — Resolve wet and outdoor areas

For kitchens, bathrooms, laundries and balconies, specify the build-up rather than just the appearance:

- Substrate assessment.
- Falls, thresholds and drainage.
- Waterproof system and testing.
- Slip-resistant finish.
- Ventilation and access.
- Outdoor exposure and furniture durability.

Keep plumbing close to verified stacks where possible. If the visual language is concrete, use an appropriate protected dry-area system and tile/stone/approved wet-area system where water exposure demands it.

Before describing a whole-renovation concept as ready for design development, also screen for demolition hazards and existing moisture/mould, electrical service capacity and protective devices, gas or combustion ventilation, smoke/CO detection where applicable, fire/egress constraints, and door-swing conflicts. Route concealed electrical, plumbing, gas, ventilation, fire-safety, and structural decisions to qualified local professionals.

## Phase 8 — Build 3D

Run this phase only when `features.interactive_3d` is true or `minimum_visuals.static_3d > 0`; otherwise skip it. Read [image-and-3d.md](image-and-3d.md). When an editable Blender deliverable or Blender render is enabled, also read [blender-iterative-workflow.md](blender-iterative-workflow.md). The Blender phase begins from the already-approved plan, QA and baseline; it does not restart design from a free-form mood prompt. Build a low-complexity, plan-faithful model first. Use Three.js for the live viewer only when enabled, and export at least the configured number of embedded static views. Three static views are a recommended default for a whole-floor project, not a universal minimum.

For a multi-floor scope, include a stacked building/core overview and at least one legible static plan view per designed floor. Add extra public/private/wet-axis views where three total views cannot communicate the project. Keep floor visibility controls separate from proposal-variant controls.

Build each floor as a separate model group from that floor's baseline. A shared camera preset may be reused only as a viewing convention, never as copied geometry. Export a same-orientation top/orthographic view and compare it with the source-plan crop before accepting perspective views.

**Gate when this phase is enabled:** each floor's outline, room boundaries, stair/core anchor, balconies, doors/windows and fixed furniture match its own frozen baseline and source-plan overlay. If two floor views differ only in labels, colours or movable furniture while their drawings differ, reject and rebuild them. A Blender output must also pass fixed-camera plan-overlay, solid/clay geometry and affected-room review; every logged defect is repaired and re-rendered from the same camera before acceptance.

## Phase 9 — Generate final renders

Run this phase only when `minimum_visuals.final_renders > 0`; otherwise skip it. Read [image-and-3d.md](image-and-3d.md). Generate only after the spatial baseline—and any enabled 3D relationships—are stable. When the image tool supports multiple references, supply the matching plan-faithful 3D view for composition if one was produced, otherwise use the relevant plan crop; use the style reference for atmosphere. None of these replace the written constraints.

Recommended default coverage for a whole-floor concept, subject to the configured minimum:

- Public room looking toward its main outdoor/view connection.
- Reverse view back into the public room.
- Work/game room or other special-use room.
- Main bedroom.
- Main bathroom or the most technically important wet area.

For a multi-floor project, the five-view list is a project minimum, not automatically five images per floor, but every designed floor still needs at least one plan-faithful final visual. Add one view for every unique high-priority space or technically consequential change; do not generate repetitive bedrooms merely to meet a count. Every prompt and output record must include `floor_id`, `room_id`, baseline version, camera ID, plan/3D reference IDs and the geometry constraints checked after generation.

Never use a previous floor's render as the composition reference for a different floor. A common style reference may unify palette and materials, but plan crop and white-model/3D references must come from the floor being rendered.

Review every image for wrong floors, wrong rooms, phantom kitchens, doors/windows in the wrong wall, impossible furniture sizes, unsafe wet details, unwanted text and inconsistent palette. Review all floors in one contact sheet: repeated wall/opening compositions are acceptable only when the floor-difference matrix supports them. Revise failures before embedding.

## Phase 10 — Materials, lighting and budget

Create a room-by-room material and lighting schedule when finishes are in scope, with:

- Recommended finish/system.
- Practical substitute.
- Colour and sheen.
- Maintenance issue.
- Wet/outdoor limitations.
- Current low/high range and source/assumption only when `features.budget` is true.

When `features.budget` is true, the budget must state area, currency, price date, region factor, 10%–15% contingency, inclusions and exclusions. Put uncertain door/window work, structural assessment, HVAC and appliances in separately selectable rows. If location or date evidence is unavailable, label the range as a generic planning allowance rather than a current local estimate. When the feature is false, omit budget rows, totals, factors, and controls rather than leaving zero-value placeholders.

## Phase 11 — Furniture and sourcing

Run the purchasing portion only when `features.sourcing` is true; otherwise omit sourcing filters and copy actions. For each included purchase, provide:

- Item and room.
- Recommended dimensions and clearance.
- Colour/material.
- Copyable search query: `category + size + material + colour + style + condition/location`.
- `second-hand preferred`, `second-hand with checks`, `buy new`, or `site-measure/custom`.

Default to new for mattresses, waterproofing, electrical concealed materials, drains, toilets, taps and shower glass. Used wood/metal tables, chairs, lamps and modular furniture may be good value after inspection.

## Phase 12 — Assemble, verify and deliver

Read [data-schemas.md](data-schemas.md), [output-contract.md](output-contract.md) and [safety-and-validation.md](safety-and-validation.md).

1. Compress every configured project image to WebP where practical.
2. Embed every designed floor's actual cropped source plan and every configured static 3D view or render into one HTML. A generated zoning schematic may supplement the source plan but may not replace it.
3. Add the interactive model and offline fallback only when `interactive_3d` is enabled.
4. Add the image viewer, budget recalculation, and copyable search terms only when their corresponding visual, budget, and sourcing features are enabled.
5. Run deterministic validation, then force-refresh the actual HTML and perform browser checks. Wait for image decoding and the Three.js ready state; switch every affected floor and camera, capture a new screenshot, and require zero console errors. Repeat this after every visible mutation rather than relying on an earlier browser session.
6. When `features.review_notes` is enabled, read [public-review-and-notes.md](public-review-and-notes.md); add stable anchors, the draggable review orb, append-only history and complete export/import before validation.
7. For an authorised public review, stage only the checked HTML and approved public assets, create the release manifest, verify hashes and plan coverage, then use the installed `vercel-deploy` skill. A visible change creates a new release ID and deployment; refresh the approved stable alias and recheck project protection before returning the same public URL. Keep the default deployment as Preview unless the user explicitly requests a stable production address.
8. Deliver only the checked file or authorised public URL, with a short summary of key decisions and limitations.

**Gate:** no unresolved placeholder, broken tab, missing image, stale dimension, cross-floor source reference, cloned floor skeleton or mismatched old model remains. The HTML follows the same per-floor order as the evidence chain: source plan, room-by-room explanation, floor-specific 3D/render, then materials and purchasing information. Review mode must state whether notes are local or shared, preserve every anchor after responsive resizing, and export a project/release-identifiable history before public hand-off.
