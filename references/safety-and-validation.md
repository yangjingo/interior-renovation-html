# Safety boundaries and validation

Use current, authoritative local sources when giving regulatory, structural, waterproofing, fire, fall-protection or pricing guidance. State the jurisdiction and date. General guidance is not proof of local approval.

## Architectural and structural boundaries

Do not authorise removal or enlargement involving:

- Load-bearing or shear walls.
- Beams, columns, ring beams, lintels or structural slabs.
- Balcony connection walls or parapets.
- Exterior walls and façade systems.
- Stair or corridor fire separation.

For each proposed opening, require the relevant combination of original structural drawings, on-site investigation, architect/structural engineer review, property/strata consent and authority approval. If feasibility is unknown, keep the existing opening as the default safe fallback.

Do not infer structural status from line thickness alone.

## Doors, windows and balconies

Check:

- Structure and lintel/edge distances.
- Exterior appearance and approval.
- Wind/rain performance and drainage.
- Threshold and indoor/outdoor level difference.
- Fall protection and child safety.
- Opening collision, cleaning access and insect screens.
- Curtain pocket, HVAC/new-air outlets and storage conflicts.

Balcony design must preserve drainage outlets and maintenance access. Confirm waterproof upstands, falls, overflow strategy, railing/guard dimensions and allowable loads locally.

## Wet areas

- Keep fixtures near verified stacks where possible.
- Confirm drain elevation before proposing long horizontal moves.
- Show a complete waterproof system, junction treatment and testing sequence.
- Use slip-resistant, maintainable wet-area finishes.
- Separate shower water where the room size permits.
- Provide ventilation and access to valves, traps and equipment.

The visual continuity of cement does not justify using an untreated dry-area floor system in a shower, bathroom or exposed balcony.

## Whole-renovation existing-condition gate

Before design development or demolition, record what is known and unknown about:

- moisture ingress, mould, rot, corrosion and substrate failure;
- region-relevant hazardous materials that may be disturbed by demolition;
- electrical service capacity, earthing/grounding, residual-current or ground-fault protection, and circuit separation;
- gas, combustion appliances, make-up air, exhaust and carbon-monoxide detection where applicable;
- smoke detection, escape routes, stair/corridor fire separation, and door-swing obstruction;
- water pressure, shut-offs, drainage stacks, traps, ventilation and maintenance access.

Do not turn a visual renovation plan into concealed MEP, gas, fire-safety, hazardous-material, or demolition instructions. Identify the survey or licensed trade required.

## Budget and procurement

Prices change. For a realistic budget:

- Ask for city/country, currency, date and quality level.
- Check current local sources when available.
- Use low/high ranges and identify assumptions.
- Separate construction, design, approvals, structural work, windows, HVAC, appliances, loose furniture and contingency.
- Warn that hidden substrate, water, electrical or structural defects can materially change cost.

Do not imply that an online price range is a contractor quote.

## Privacy and reference rights

- Check plan title blocks and embedded images for identifying or third-party content.
- Use cropped/redacted plan views in shareable outputs where practical.
- Keep reference photographs out of the final HTML unless inclusion is requested and appropriate.
- Preserve existing watermarks. Base64 embedding is packaging, not anonymisation or permission.
- Never bundle a watermarked/private reference in a distributable example. Replace it with a newly generated privacy-safe reference; do not erase or cover the original watermark.
- Use `yj` as the only example identity when a name is necessary. Scan text, filenames, PDF metadata, embedded HTML payloads and native 3D files for real names, account IDs, contact details, absolute user paths and location clues before release.

## Deterministic HTML checks

Run `node "<skill-root>/scripts/validate-renovation-html.mjs" <file.html>` and inspect the result. It checks useful static invariants, but it does not replace browser and design review. The bundled sanitised example is deliberately blocked by the normal release command; use `--allow-golden-example` only while testing that one example, never for a real project.

Before distributing any `example/` tree, also run `python "<skill-root>/scripts/validate-example-privacy.py" "<skill-root>/example"`. Pass each known real-world name that is not the current workstation username with a repeated `--forbid "<value>"`. The script checks file bytes, contact patterns, PDF metadata and image metadata; manually inspect raster images for watermarks, faces and identifiable exteriors.

Also verify:

- Every designed floor maps to the correct printed floor label and source page; page order alone is not evidence.
- Each drawing panel visibly embeds that floor's cropped source plan, not only a generated schematic.
- Axis sums, room dimensions and area wording are not conflated.
- Each data point is fact, inference or proposal.
- Every visible room/zone on every designed floor has a user-facing room-ledger card tied to the same floor and source page.
- When enabled, each floor's 3D outline, zones, stair/core anchor and openings match its own frozen baseline and source-plan overlay.
- Every touching zone pair has one canonical shared coordinate and one explicit `solid` / `fully-open` / `door-opening` / `glazed-partition` treatment; no overlap, sliver or near-parallel duplicate wall is visible.
- When configured, static 3D previews come from the same plan version.
- When configured, every final render matches its floor, named room, adjacent space, baseline version and camera record.
- Every configured special-area/重点区域 card contains a visible decoded same-floor image; text-only cards fail even when the corresponding render exists in another panel.
- Whole-floor previews have comparable user-facing fidelity across floors. A raw grey/white model cannot stand in for a polished furnished bird's-eye preview supplied for the other floors.
- Every user-facing static 3D card is marked polished; rough models are explicitly supplemental and collapsed, or removed together with their asset/provenance/correspondence records.
- Every highlighted door/window change has a matched existing/proposed visual pair in the openings panel.
- Old generic renders are labelled as style references.
- When enabled, budget default totals recompute correctly.
- Every configured copy, filter, lightbox, image download, screenshot and tab action is bound; controls for disabled features are absent.
- Narrow-screen layout is usable.
- When enabled, Three.js failure leaves the rest of the document functional.
- After the most recent mutation, the actual delivery HTML was force-refreshed, affected floors/cameras were revisited, fresh screenshots were captured, the viewer reached ready state, and the console had zero errors.
- A restrictive Content Security Policy blocks connections, frames, forms, objects and unapproved active dependencies.
- All project images decode.
- No placeholder, private temporary path or obsolete plan/model remains.
- The body project ID, visible panels, visual minimums, currency, preflight statuses and machine-readable budget total match `projectConfig`.
- Every enabled 3D floor zone and proposed opening is derived from the canonical baseline and selected variant rather than copied from the example.
- A side-by-side floor comparison shows the plan-specific differences. If drawings differ, no two floors are merely the same shell with changed labels, furniture or finishes.
- No unintended name, address, contact detail, face, exterior view, watermark, or third-party reference is published.
- Every bundled example identity is `yj`, and Blender/PDF/native-file metadata contains no workstation username or absolute personal path.

## Release checklist

- [ ] Complete input inventory.
- [ ] Every designed floor verified against its printed label and source page.
- [ ] Floor-page map, source-plan crops and floor-difference matrix completed.
- [ ] Plan facts/inferences/proposals separated.
- [ ] One room ledger and one independent spatial baseline completed per designed floor; shared data is limited to the verified building core.
- [ ] Configured preflight ledger completed with `clear` / `unknown` / `issue` / `not_applicable` status; whole-home and selected-floor scopes include all eight required categories.
- [ ] Door/window changes risk-labelled with fallbacks.
- [ ] Highlighted door/window changes include matched existing/proposed visuals.
- [ ] Wet/outdoor systems described.
- [ ] Enabled 3D checked against each floor's source-plan overlay and baseline, or marked not applicable.
- [ ] Requested Blender output has an immutable prior snapshot, per-floor collections, fixed-camera plan/solid checks, an issue/recheck log, and refreshed affected-room renders.
- [ ] Configured static 3D fallback embedded, or marked not applicable.
- [ ] Configured final renders reviewed against `visual-correspondence.json`, paired with same-floor plan/3D evidence and compared across floors, or marked not applicable.
- [ ] Every named special area has a visible same-floor image in its mapped panel.
- [ ] Every designed floor has a complete overall 3D preview at comparable presentation quality; raw models are supplemental when polished previews exist.
- [ ] Materials scoped; enabled budget dated/scoped, or budget marked not applicable.
- [ ] Enabled furniture/sourcing guidance includes dimensions and sourcing status, or marked not applicable.
- [ ] HTML static validation passed.
- [ ] Real deliverable has a new project ID/fingerprint and `is_golden_example: false`.
- [ ] Browser checks completed when a browser is available; otherwise state the limitation.
- [ ] The browser and any authorised public alias were refreshed after the latest visible change; returned links point to that checked release rather than a stale deployment.
