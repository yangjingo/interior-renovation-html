# Golden Example: Sanitised third-floor warm-concrete renovation

Use this example to understand the complete workflow and the separation of evidence. It was derived from the current conversation, then sanitised for safe reuse. It is not a construction drawing.

## Bundled example files

| Role | File |
|---|---|
| Project contract, feature flags and golden-example sentinel | `../assets/example-third-floor/inputs/project-config.json` |
| Source provenance and redaction note | `../assets/example-third-floor/inputs/source-provenance.md` |
| Extracted plan facts | `../assets/example-third-floor/inputs/plan-facts.json` |
| Frozen coordinate baseline | `../assets/example-third-floor/inputs/spatial-baseline-v1.json` |
| Physical modifications and variants | `../assets/example-third-floor/inputs/modifications.json` |
| Whole-renovation preflight ledger | `../assets/example-third-floor/inputs/preflight-ledger.json` |
| Embedded image provenance | `../assets/example-third-floor/inputs/asset-provenance.json` |
| Distilled style reference | `../assets/example-third-floor/inputs/style-reference-brief.md` |
| Normalised requirements | `../assets/example-third-floor/inputs/user-constraints.md` |
| Input routing and authority | `../assets/example-third-floor/inputs/input-manifest.yaml` |
| Distilled presentation guidance | `../assets/example-third-floor/inputs/presentation-brief.md` |
| Checked single-file result | `../assets/example-third-floor/output/example-third-floor-renovation.html` |

The original plan PDF, watermarked reference photo, and uploaded third-party instruction files are deliberately not bundled. The package contains derived facts and briefs, plus a schematic plan substitute. This preserves the value of the current inputs as an example without redistributing identifying or third-party source material. The contract sets `is_golden_example: true`; the validator also recognises the bundled project ID and fingerprint, and refuses this identity without the explicit test-only flag so it cannot be accidentally delivered unchanged as a new project.

## Request represented by this example

Plan the third floor of a multi-storey residence as a spacious, comfortable, warm-concrete minimalist home. Retain all three balconies; allow measured door and window refinements; create two bedrooms, a study/game room, a large family lounge, and two bathrooms. Use practical material substitutes, a 180 × 80 cm sit-stand desk, mattress-only sleeping arrangements with a ventilated base, dry-area self-levelling flooring, and tiled waterproof wet areas. Deliver interactive 3D, static 3D previews, final room renders, material and budget guidance, sourcing keywords, and one downloadable HTML.

## Extracted plan facts

The original PDF contains three floors. The target is the page labelled as the third floor, not merely the third page by assumption. Because only that floor is designed, the project uses `scope_type: selected-floor` and `features.multi_floor: false`; the other pages are still audited for stair, shaft and wet-stack continuity.

| Item | Recorded baseline | Status |
|---|---|---|
| Printed floor area | About 180 m² | Drawing fact |
| Overall width chain | 4,800 + 5,000 + 4,200 = 14,000 mm | Drawing fact |
| Approximate depth | 13,780 mm | Design inference subject to site check |
| Left study bay | About 4.8 × 4.8 m | Inference from the continuous dimension chain |
| Central family lounge | About 5.0 × 8.0 m | Drawing-led approximation |
| Landscape balcony | About 4.8 × 5.0 m, around 24 m² | Drawing-led approximation |
| Service balcony | About 4.8 × 1.8 m | Drawing-led approximation |
| Front balcony | About 5.0 × 2.18 m | Drawing-led approximation |

An early reading treated the study as roughly 4.8 × 3.3 m. The full dimension chain showed that this was too shallow; the shared baseline was corrected before rebuilding the 3D model.

## Frozen design baseline

- Two bedrooms, one study/game room, one large family lounge, two bathrooms, and three retained balconies.
- Warm mineral concrete, smoked timber, matte black metal, tactile textiles, and layered 3000–3500 K lighting.
- Sparse low furniture and a visually empty main circulation route.
- A 180 × 80 cm dual-motor sit-stand desk with task lighting and concealed cable management.
- Mattress-only sleeping: no conventional bed frame, but a thin ventilated slatted or moisture-control base remains mandatory.
- Dry areas: repaired substrate, cement-based self-levelling layer, and a matte protective system.
- Bathrooms and balconies: waterproofing, falls, drainage, movement joints, and non-slip tile or slab; visual continuity does not mean using the same physical material system.
- The main bathroom may expand to roughly 4.2 × 1.8 m only within the existing wet-service zone and only if the adjusted partition is confirmed non-structural.

## Physical modification options

These are concept options, not approved dimensions. Every record separates an enum `risk_level` from its explanatory `risk` text. The example also records the interior-door, wet-core and bedroom-window proposals in `modifications.json`, so all six visible changes belong to the same `option-a` variant:

| Location | Concept range | Purpose | Release condition |
|---|---:|---|---|
| Family lounge → landscape balcony | 3.0–3.6 m | Create the primary indoor-outdoor axis | Verify wall, beam, lintel, façade, waterproof threshold, wind/rain, and approvals |
| Family lounge → front balcony | 2.4–3.0 m | Add light and cross-ventilation | Same checks; keep one complete wall for projection/storage |
| Study → service balcony | About 2.4 m | Improve working light and balcony access | Confirm façade module, privacy, drainage, and opening type |

For each proposal, the HTML also retains a no-demolition alternative: keep the existing opening, use a slimmer frame, align finishes, and clear the sightline with furniture placement.

## Source routing demonstrated

- The plan PDF controls geometry and adjacency.
- The warm-concrete bedroom photo controls atmosphere, colour, texture, and lighting only; it does not control room geometry.
- The distilled warm editorial brief controls the HTML shell and hierarchy.
- The distilled hand-drawn diagram note applies only to optional explanatory annotations.
- The uploaded animated Excalidraw/Synapse instruction file was recorded as ignored because no such diagram was requested; it is not copied into the installable skill.

## Corrections that matter

1. A previous generic 125 m² three-bedroom model became invalid after the real 180 m² plan arrived. It was replaced rather than quietly patched.
2. The plan-faithful 3D model was frozen before final visual generation.
3. A generated image that introduced an unplanned kitchen-like zone was rejected and revised. Every render must pass a function and geometry check, not only a style check.
4. Earlier unrelated room renders remain labelled as style references; they are not evidence of the proposed third-floor layout.

## Expected example output

The bundled HTML uses seven tabs: overview, plan/zoning, doors/windows, balconies, 3D/renders, materials/budget, and furniture/search terms. It includes a live Three.js model, three embedded static 3D fallbacks, five plan-specific final renders, twelve clearly labelled earlier style references, and one sanitised schematic plan view. That is 20 gallery assets plus the schematic plan. `asset-provenance.json.assets` accounts for every gallery key, while `direct_visuals.planSchematic` records the generated SVG; all four source/private-content permissions in `projectConfig.asset_policy` remain false. The raw style photo and private plan are absent. Images are embedded so the document remains visually useful offline; live Three.js needs the pinned CDN unless dependencies are inlined.

The refreshed example also demonstrates the public-review shell used by the deployed reference: stable `data-review-anchor` markers, visible image-slot placeholders, a draggable pin-and-pencil review orb, a mobile bottom-sheet drawer, append-only local history, import, and JSON / Markdown / CSV export. Its mode is deliberately `local_export` and is visibly labelled `本机草稿`; notes do not synchronise across devices. Reused balcony and wet-area visuals are rendered inside their mapped special-area panels so those panels are not text-only.

The three static 3D cards must use the polished furnished third-floor baseline. The whole-floor card preserves the full footprint; the balcony and private cards use presentation crops from that same checked baseline. Raw white or grey engineering previews from development folders are not valid user-facing or golden-example assets.

Run the validator after any edit:

```bash
node "<skill-root>/scripts/validate-renovation-html.mjs" \
  --allow-golden-example \
  "<skill-root>/assets/example-third-floor/output/example-third-floor-renovation.html"
```

Use `--allow-golden-example` only for the bundled example. A real deliverable must have a new project ID, a fingerprint of its sanitised intake manifest, and `is_golden_example: false`; validate it without this flag.
