# Input contract

Use this file to decide whether work can begin and which assumptions must be exposed.

## Minimum viable input

The normal minimum is:

1. A residential plan PDF exported from CAD, or a clear dimensioned plan image.
2. At least one style reference image or a precise written style description.
3. The target scope: whole home, one floor, or named rooms.

If these are present and the user's requirements are already concrete, proceed without another confirmation round.

## Strongly recommended input

| Input | Why it changes the result |
| --- | --- |
| Target floor and approximate gross area | Prevents planning the wrong page or mixing floors |
| Household and room functions | Sets bedroom count, work/gaming, guests, children, ageing, and storage |
| North/orientation, view and noisy sides | Changes openings, light control and room placement |
| Known load-bearing plan or structural system | Determines whether openings are proposals or plausible low-risk edits |
| What must remain and what may move | Prevents unapproved scope expansion |
| Kitchen fuel and ventilation condition | Affects open/closed kitchen options |
| Bathroom, balcony and laundry requirements | Controls wet stacks, drainage and waterproofing |
| Fixed furniture dimensions | Keeps 3D, renders and purchasing consistent |
| City/country, budget and target date | Needed for current prices, local rules and procurement |
| Ceiling, beam, window-sill and window-head heights | Determines vertical 3D geometry, openings, curtains and final-render proportions |
| Offline requirement | Determines whether Three.js libraries must be embedded |

## CAD PDF quality

Prefer a vector PDF with:

- Floor names and page titles.
- Axis grid and chained dimensions.
- Room names and printed areas where available.
- Wall, column, beam and stair indications.
- Door/window position and swing or opening notation.
- Balconies, shafts, plumbing stacks and level changes.
- Scale and revision/date information.

For a multi-floor set, map every printed floor label to its page before choosing a design page. Render and retain one plan crop per designed floor, then compare outline, core/stair position, room graph, openings, balconies, wet areas and dimension chains. Similar page styling is not evidence that the floor plans share the same geometry.

Page scale such as `1:100` is not enough to measure screen pixels reliably. Use printed dimension strings and calibrated geometry. Label pixel-derived measurements as estimates.

If text extraction is empty or incomplete, do not treat the PDF as blank. Render every page, use OCR when available, and manually transcribe the critical labels and dimension chains from the rendered page. Record OCR/manual values with page, region, confidence, and a site-measure flag. Never let OCR silently overwrite a visible drawing label.

## Source-of-truth hierarchy

1. Printed dimensions and explicit notes on the drawing.
2. Dimension-chain arithmetic and adjacency that can be cross-checked.
3. Calibrated measurement from a clean vector/rendered page.
4. Design inference.
5. Assumption.

Never silently promote level 3–5 information to a drawing fact.

## Required intake summary

Before designing, write an internal summary with:

- Files received and each file's role.
- Target floor/rooms.
- Drawing revision and gross-area wording.
- Style elements to keep and avoid.
- Functional requirements and exact furniture sizes.
- Allowed modifications.
- Location, budget and offline requirement.
- Unknowns and their impact.

Once this scope and source routing are resolved, create `project-config.json` before extracting geometry or adapting the example. Its target, enabled features, panel list and preflight profile are authoritative for the deliverable. Fingerprint the sanitised routing manifest only after recording the permitted-change boundary; recompute the fingerprint whenever that manifest changes.

## Missing-information rules

| Missing item | Response |
| --- | --- |
| Multi-floor PDF but no target floor | Ask which floor(s) to design |
| Several floors selected but their intended roles are unclear | Ask for one short purpose statement per floor; continue extracting drawing facts while awaiting it |
| No scale or dimensions | Offer a concept only and mark all sizes for site measurement |
| No structural information | Do not identify a wall as removable; give risk level and review path |
| No city/country | Use an explicitly generic planning allowance with a user-adjustable factor; do not call it a current local price |
| No budget | Offer a practical-value baseline with low/high ranges |
| No household information | For an early concept only, state `1–2 adults, no child/ageing/accessibility assumptions, one flexible guest/work room`; make it editable and avoid specialised safety claims |
| No must-keep / may-move boundary | Default to no wall, opening, window, façade, wet stack or fixed service move; explore furniture, lighting and finishes only |
| No ceiling/beam/sill/head heights | Ask once if vertical accuracy matters. Otherwise state visible concept assumptions, store them in `projectConfig.vertical_assumptions`, mark them for site measurement, and describe the model as plan-faithful but vertically conceptual |
| Blurry plan | Request a clearer vector PDF; do not manufacture precision |
| Style image only | Analyse style or generate independent concepts, but do not claim a plan-based design |

## Style references

Extract only observable or user-confirmed qualities:

- Warm/cool bias and saturation.
- Wall, ceiling, floor and joinery appearance.
- Furniture height, density and silhouette.
- Daylight direction and artificial-light hierarchy.
- Degree of rawness, softness and maintenance tolerance.

Do not assume that a reference bedroom is the target bedroom or edit the reference photo unless explicitly requested.

If the user supplies both a polished UI guide and a hand-drawn diagram guide, assign them to different layers. The UI guide controls the HTML shell; the diagram guide controls optional explanatory diagrams. Neither controls architectural geometry or photorealistic render style.

## Privacy and rights intake

Before publishing or bundling source material, inspect plan title blocks and reference images for names, addresses, phone numbers, signatures, faces, exterior views, platform watermarks, and third-party artwork.

- Keep originals untouched in a private project workspace. Never copy those originals into a distributable example merely to make the example reproducible.
- Default the final HTML to a cropped target-floor plan and newly generated project visuals, not the raw style-reference image.
- Embed the raw plan or style image only when it helps the requested deliverable and the user has the right or a clear private-use reason to include it.
- Preserve third-party watermarks; do not remove or obscure them.
- A distributable example must not retain real names, addresses, contacts, account IDs, faces, identifiable exterior views, absolute user paths or private metadata. Replace any necessary example identity with the neutral alias `yj`; regenerate or rasterise a safe derivative when redaction would leave uncertain hidden data.
- Do not publish an example while any raster content remains unredacted. Replace a third-party or private style photo with a newly generated privacy-safe reference instead of removing its watermark.
