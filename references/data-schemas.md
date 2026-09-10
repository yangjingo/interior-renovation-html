# Data schemas and staging contract

These schemas make the evidence chain reproducible. JSON field names may be extended, but do not remove the distinction between facts, inferences, proposals, and site measurements.

## Recommended staging tree

```text
work/
├── intake-summary.md
├── project-config.json
├── audit/
│   ├── page-01.png
│   ├── page-ocr.json
│   ├── floor-page-map.json
│   ├── floor-difference-matrix.json
│   └── floor-01-plan.webp
├── plan-facts.json
├── building-core.json
├── spatial-baseline-v1.json
├── room-ledgers/
│   └── floor-01.json
├── modifications.json
├── preflight-ledger.json
├── asset-provenance.json
├── visual-correspondence.json
├── review/
│   ├── review-config.json
│   ├── review-notes.json
│   └── release-manifest.json
├── 3d/
│   ├── model.mjs
│   ├── bird-eye.webp
│   ├── public-axis.webp
│   └── private-wet-axis.webp
├── renders/
├── render-prompts/
├── schedules/
│   ├── materials.json
│   ├── budget.json
│   └── sourcing.json
└── build/
    ├── renovation-template.html
    └── asset-manifest.json
```

Only the checked single HTML is normally released. Staging files remain working evidence unless the user asks for them.

## Project contract

Create `project-config.json` immediately after the intake scope and source roles are resolved, and before building geometry, visuals, or HTML. It makes one validator work for a whole home, a selected floor, a room, another locale, or a project without a balcony. Do not edit the validator to fit each project. Recompute `input_fingerprint` whenever the sanitised input manifest changes.

```json
{
  "version": 1,
  "project_id": "project-2026-09-living-floor",
  "input_fingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "input_fingerprint_method": "sha256 of sanitised input-manifest.yaml bytes",
  "is_golden_example": false,
  "scope_type": "selected-floor",
  "locale": "zh-CN",
  "target": {
    "id": "floor-3",
    "label": "third floor",
    "floor_ids": ["floor-3"],
    "primary_floor_id": "floor-3",
    "area_value": 180,
    "area_unit": "m2",
    "area_basis": "printed gross floor area",
    "source_id": "third-floor-area"
  },
  "required_panels": ["overview", "drawing", "openings", "visuals", "materials", "furniture"],
  "features": {"plan": true, "modifications": true, "special_areas": [], "interactive_3d": true, "budget": true, "sourcing": true, "multi_floor": false, "review_notes": false},
  "special_area_panels": {},
  "minimum_visuals": {"static_3d": 3, "final_renders": 5},
  "required_preflight_categories": ["moisture_mould", "demolition_hazards", "electrical", "gas_combustion_co", "smoke_egress_fire", "door_swings", "plumbing_drainage_ventilation", "structural_facade"],
  "preflight_status_labels": {"unknown": "未知", "clear": "已核清", "issue": "发现问题", "not_applicable": "不适用"},
  "asset_policy": {"allow_source_photo": false, "allow_face": false, "allow_watermark": false, "allow_private_plan": false},
  "budget": {"currency_code": "CNY", "currency_symbol": "¥", "unit_divisor": 10000, "unit_label": "万", "price_date": "2026-09", "contingency_rate": 0.10, "required_optional_categories": ["hvac", "appliances"]},
  "vertical_assumptions": {"status": "proposal_pending_site_measure", "model_wall_height_mm": 2800, "model_window_sill_mm": 900, "model_window_head_mm": 2400}
}
```

Use these project-contract rules:

- `project_id` is a new stable slug for the project, using lowercase letters, digits and hyphens. Do not retain the bundled example ID.
- `input_fingerprint` is exactly 64 lowercase hexadecimal characters. Hash a sanitised intake manifest or normalised facts—not raw names, addresses, or images—and record the method.
- `scope_type` is `whole-home`, `selected-floor`, or `room`. `target.floor_ids` contains every designed floor; `primary_floor_id` is a member of that array and controls the initial view. For a room scope, also add `room_ids`. The area must state its basis and source, not only a number. For multi-floor work, add `areas_by_floor` records with `floor_id`, value, unit, basis and source ID, and make the top-level `area_value` an explicitly labelled aggregate.
- `features.multi_floor` means that this deliverable designs more than one floor. A multi-page PDF or a multi-storey building with only one selected design floor still uses `false`, although adjacent floors must be audited for stairs, shafts and stacks.
- `required_panels` is the exact ordered list of top-level tab IDs. A no-balcony room scheme must not invent a balcony panel merely to satisfy an example.
- `features.special_areas` is an array of stable area keys, not a Boolean. Every key maps through `special_area_panels` to a panel ID in `required_panels`; several keys may share one panel, and the destination may be a general panel such as `materials` rather than a dedicated special-area tab.
- `minimum_visuals.static_3d` and `minimum_visuals.final_renders` are non-negative project-wide integers and independently activate those deliverables. `interactive_3d` controls only the live Three.js view. In multi-floor work, an active visual class must still represent every designed floor at least once, so the actual count may need to exceed the configured minimum.
- Whole-home and whole-floor scopes require all eight preflight categories shown above. A limited room scope may name only the applicable categories, but the ledger may be a documented superset.
- `asset_policy` is the release boundary for source photos, faces, watermarks and private plans. All four values default to `false`; changing one to `true` requires an explicit user/private-use basis and matching provenance. Asset provenance cannot grant permission that this policy denies.

Feature dependencies are contractual:

| Control | Required when active | Inactive state |
|---|---|---|
| `features.plan` | `drawing` panel, plan facts, and a single- or multi-floor baseline | No plan-faithful claim; omit plan interactions |
| `features.modifications` | Non-empty modifications, a visible adjustments panel, and proposal variants | Embed `modifications` as `[]`; preserve the existing state |
| `features.special_areas` | Visible coverage for every mapped area key | Empty array and empty mapping |
| `features.interactive_3d` | Live model, named views, error/fallback state | No Three.js module required |
| `minimum_visuals.static_3d > 0` | Matching embedded static 3D assets | No static-3D minimum |
| `minimum_visuals.final_renders > 0` | Plan-specific final renders and image viewer | No final-render minimum |
| `features.budget` | Budget config, visible dated assumptions, rows, and recalculation | Budget config and controls may be omitted |
| `features.sourcing` | Furniture/sourcing panel, filters, sizes and search terms | Sourcing panel and controls may be omitted |
| `features.multi_floor` | `buildingCore`, one `floorBaselines` and room-ledger record set per designed floor, visual correspondence, and per-panel floor selectors/containers | Use one `spatialBaseline` |
| `features.review_notes` | `reviewConfig`, `reviewNotes`, `releaseManifest`, stable review anchors and history/export UI | Omit review UI and note data |

The validator must check that the feature matrix, required panels and evidence blocks agree; it must not impose the bundled example's seven panels, balcony, currency, or visual counts on another project.

## Review notes and release manifest

When `features.review_notes` is true, use the schemas and anchor rules in [public-review-and-notes.md](public-review-and-notes.md). `review-config.json` declares `storage_mode` as `local_export` or `remote`, the current `release_id`, export formats and whether 3D raycast anchors are enabled. Do not set `remote` without a real authorised backend.

`release-manifest.json` records the staged `index.html` SHA-256 and byte size, embedded and external public-asset hashes, project ID, release ID, floor baseline versions and privacy-review result. `review-notes.json` is the canonical append-only note history. Each note binds to the same project/release and includes floor, baseline, panel, stable anchor, normalised coordinates, author, body, status, timestamps and events; 3D notes additionally include camera state and an object/world position when available.

## Plan fact record

```json
{
  "id": "third-floor-overall-width",
  "item": "overall horizontal dimension chain",
  "value": 14000,
  "unit": "mm",
  "class": "drawing_fact",
  "source": { "page_label": "third floor", "region": "top dimension chain", "raw_text": "4800+5000+4200" },
  "derivation": "sum of printed chained dimensions",
  "confidence": "high",
  "site_measure": true,
  "notes": "verify before ordering openings or built-ins"
}
```

Allowed `class` values are `drawing_fact`, `design_inference`, and `proposal`. A proposed dimension must never overwrite a drawing fact.

## Floor-page map and difference matrix

For a multi-page or multi-floor set, create `floor-page-map.json` before detailed extraction. Each record includes `floor_id`, `printed_label`, `source_page_id`, `page_index`, `plan_asset_id` and verification notes. Then create `floor-difference-matrix.json` with one pairwise record per designed-floor pair covering `outline`, `core_stair`, `room_graph`, `partitions`, `openings`, `balconies`, `wet_areas` and `dimension_chains`. Each field records `same`, `different` or `unknown`, plus source IDs or a note. Do not use “same” simply because the sheets share a CAD template.

## Spatial baseline

Use one unit and one origin throughout. Rectangles are acceptable for concept geometry when irregularities are recorded.

```json
{
  "version": 1,
  "floor_id": "floor-3",
  "scope": "third floor",
  "units": "m",
  "origin": "south-west exterior axis intersection",
  "overall_bounds": {"x": 0, "z": 0, "width": 9.8, "depth": 10.18},
  "orientation": { "north": "unknown" },
  "source_state": "existing-drawing",
  "preferred_visual_state": "option-a",
  "zones": [
    {
      "id": "family-lounge",
      "label": "家庭厅",
      "bounds": { "x": 4.8, "z": 2.18, "width": 5.0, "depth": 8.0 },
      "classification": "dry-interior",
      "confidence": "medium"
    },
    {
      "id": "landscape-balcony",
      "label": "景观阳台",
      "bounds": { "x": 0, "z": 2.18, "width": 4.8, "depth": 5.0 },
      "classification": "exterior",
      "confidence": "medium"
    }
  ],
  "shared_boundaries": [{"a": "family-lounge", "b": "landscape-balcony", "segment": {"x1": 4.8, "z1": 2.18, "x2": 4.8, "z2": 7.18}}],
  "openings": [{"id": "opening-01", "between": ["family-lounge", "landscape-balcony"], "modification_id": "lounge-balcony-opening-option-a"}],
  "circulation": [{"id": "public-axis", "from": "family-lounge", "to": "landscape-balcony", "class": "proposal", "site_measure": true}],
  "variants": [
    {"id": "existing", "modification_ids": [], "zone_deltas": {"remove": [], "add": []}, "boundary_deltas": {"remove": [], "add": []}},
    {"id": "option-a", "modification_ids": ["lounge-balcony-opening-option-a"], "zone_deltas": {"remove": [], "add": []}, "boundary_deltas": {"remove": [], "add": []}}
  ],
  "fixed_furniture": [],
  "unresolved": []
}
```

Every baseline contains an immutable existing drawing state. It must include an `existing` variant with no modification IDs or deltas. `preferred_visual_state` names exactly one variant. That preferred variant's `modification_ids` must exactly match the records whose `preferred_for_visualisation` is true and whose `variant_ids` include it. Modification `base_version` values must equal the baseline version. Zone additions, boundaries, circulation and openings must reference valid active-zone IDs and stay within `overall_bounds`.

For a deliverable that designs multiple floors, add `building-core.json` and embed it as `buildingCore`; embed a flat array of full baseline records as `floorBaselines`. Do not also embed a second, drifting `spatialBaseline` alias. Every record has a unique `floor_id`, an integer `building_core_version` equal to `buildingCore.version`, and all ordinary baseline fields. `buildingCore.floor_ids`, `projectConfig.target.floor_ids`, and the `floorBaselines` floor IDs must be exact set matches.

Each multi-floor baseline also records its own source and identity fields:

```json
{
  "floor_id": "floor-1",
  "source_page_id": "pdf-page-03",
  "source_plan_asset_id": "plan-floor-1",
  "floor_identity": {
    "outline_source_ids": ["f1-overall-width", "f1-overall-depth"],
    "core_anchor_ids": ["stair-a-floor-1"],
    "zone_ids": ["f1-entry", "f1-living", "f1-dining"],
    "opening_ids": ["f1-door-01", "f1-window-01"],
    "dimension_source_ids": ["f1-axis-x", "f1-axis-z"]
  }
}
```

The identity record is evidence, not a decorative fingerprint. Different plans may share the building core, but they must not share an unchanged floor identity unless the floor-difference matrix proves the drawings are the same. When two designed floors genuinely have identical canonical geometry, add `drawing_equivalent_to_floor_id` and non-empty `equivalence_source_ids` to the later floor's `floor_identity`; otherwise exact cross-floor geometry is treated as accidental cloning.

```json
{
  "version": 1,
  "units": "m",
  "floor_ids": ["floor-1", "floor-2"],
  "stairs": [{"id": "stair-a", "serves_floors": ["floor-1", "floor-2"], "footprints_by_floor": {"floor-1": {"x": 4.8, "z": 0, "width": 5, "depth": 3.6}, "floor-2": {"x": 4.8, "z": 0, "width": 5, "depth": 3.6}}}],
  "shafts": [],
  "facade_grid": [],
  "wet_stacks": [],
  "vertical_services": [],
  "unresolved": ["structural system", "stack centre lines"]
}
```

Example `floorBaselines` shape:

```json
[
  {
    "floor_id": "floor-1",
    "building_core_version": 1,
    "version": 2,
    "scope": "first floor",
    "units": "m",
    "origin": "shared building-core origin",
    "overall_bounds": {"x": 0, "z": 0, "width": 14, "depth": 13.8},
    "source_state": "existing-drawing",
    "preferred_visual_state": "existing",
    "zones": [
      {"id": "floor-1-stair-arrival", "label": "stair arrival", "bounds": {"x": 4.8, "z": 0, "width": 5, "depth": 3.6}, "classification": "circulation", "confidence": "high"},
      {"id": "floor-1-living-zone", "label": "living zone", "bounds": {"x": 4.8, "z": 3.6, "width": 5, "depth": 8}, "classification": "dry-interior", "confidence": "medium"}
    ],
    "shared_boundaries": [{"a": "floor-1-stair-arrival", "b": "floor-1-living-zone", "segment": {"x1": 4.8, "z1": 3.6, "x2": 9.8, "z2": 3.6}}],
    "openings": [],
    "circulation": [{"id": "floor-1-arrival-route", "from": "floor-1-stair-arrival", "to": "floor-1-living-zone", "class": "drawing_fact", "site_measure": true}],
    "variants": [{"id": "existing", "modification_ids": [], "zone_deltas": {"remove": [], "add": []}, "boundary_deltas": {"remove": [], "add": []}}],
    "fixed_furniture": [],
    "unresolved": []
  },
  {
    "floor_id": "floor-2",
    "building_core_version": 1,
    "version": 1,
    "scope": "second floor",
    "units": "m",
    "origin": "shared building-core origin",
    "overall_bounds": {"x": 0, "z": 0, "width": 14, "depth": 13.8},
    "source_state": "existing-drawing",
    "preferred_visual_state": "existing",
    "zones": [
      {"id": "floor-2-stair-arrival", "label": "stair arrival", "bounds": {"x": 4.8, "z": 0, "width": 5, "depth": 3.6}, "classification": "circulation", "confidence": "high"},
      {"id": "floor-2-living-zone", "label": "living zone", "bounds": {"x": 4.8, "z": 3.6, "width": 5, "depth": 8}, "classification": "dry-interior", "confidence": "medium"}
    ],
    "shared_boundaries": [{"a": "floor-2-stair-arrival", "b": "floor-2-living-zone", "segment": {"x1": 4.8, "z1": 3.6, "x2": 9.8, "z2": 3.6}}],
    "openings": [],
    "circulation": [{"id": "floor-2-arrival-route", "from": "floor-2-stair-arrival", "to": "floor-2-living-zone", "class": "drawing_fact", "site_measure": true}],
    "variants": [{"id": "existing", "modification_ids": [], "zone_deltas": {"remove": [], "add": []}, "boundary_deltas": {"remove": [], "add": []}}],
    "fixed_furniture": [],
    "unresolved": []
  }
]
```

For multi-floor work, add `floor_id` to plan facts, modifications, quantities, budget items, sourcing items and camera/render records so the HTML can filter them. Elements shared by all floors use an explicit `scope: "building"` rather than an omitted floor ID.

## Room ledger and visual correspondence

Create one room-ledger record for every room or named zone visible on each designed floor:

```json
{
  "floor_id": "floor-1",
  "room_id": "f1-study",
  "source_page_id": "pdf-page-03",
  "printed_label": "书房",
  "proposed_use": "双人书房",
  "dimensions": [{"value": "3600 × 4200", "unit": "mm", "class": "design_inference", "source_ids": ["f1-axis-x", "f1-axis-z"], "site_measure": true}],
  "adjacent_room_ids": ["f1-corridor", "f1-balcony"],
  "opening_ids": ["f1-door-07", "f1-window-05"],
  "fixed_furniture": [{"item": "desk", "size_mm": [1800, 800]}],
  "design_explanation": "Keep the window side open and place the desk on the complete wall.",
  "unknowns": ["window sill height"]
}
```

The HTML renders these as user-facing room cards, not as a raw JSON dump. Their floor IDs, room IDs and source page IDs must remain linked.

Create `visual-correspondence.json` for every static 3D view and final render:

```json
{
  "asset_id": "f1-study-final-01",
  "asset_type": "plan-specific-final-render",
  "floor_id": "floor-1",
  "room_ids": ["f1-study"],
  "baseline_version": 2,
  "variant_id": "option-a",
  "camera_id": "f1-study-door-to-window",
  "reference_asset_ids": ["plan-floor-1", "f1-study-white-model", "style-01"],
  "modification_ids": [],
  "comparison_state": "final",
  "geometry_checks": {"outline": "pass", "adjacency": "pass", "openings": "pass", "fixed_furniture": "pass"},
  "review_notes": "Desk 1800 x 800 mm shown on the north wall; balcony door remains on the east wall."
}
```

A render cannot be called plan-specific when its floor/room/baseline/camera references are missing or any geometry check fails. Bind its visible element with `data-visual-correspondence-id="<asset_id>"`. For a highlighted door/window modification, create two records that include the same modification ID and camera ID with `comparison_state` values `existing` and `proposed`. Repeated compositions across floors need an explicit drawing-based justification.

The HTML selector contract is mechanical: `drawing` and every included `openings`, `visuals`, `materials`, and `furniture` panel must contain its own set of `<button data-floor-target="…">` controls covering `projectConfig.target.floor_ids`, plus containers marked `data-floor-container="true"` and `data-floor-id` covering the same IDs. Put `data-building-core-version` on the panel and each container. Put that floor record's `version` in `data-baseline-version` and its `preferred_visual_state` in `data-variant` on every container. Runtime JavaScript reads `dataset.floorTarget` and `dataset.floorId` (or the equivalent `getAttribute` calls) and toggles content visibility; it must not reuse a proposal-variant control as the floor selector. Nested room cards, plan images and visual assets may also carry `data-floor-id`, so never select floor containers by `data-floor-id` alone.

## Modification record

```json
{
  "id": "lounge-balcony-opening-option-a",
  "category": "exterior-opening",
  "location": "family lounge to landscape balcony",
  "base_version": 1,
  "variant_ids": ["option-a"],
  "existing_condition": "opening exists; clear width and structural edges are unverified",
  "status": "proposal",
  "preferred_for_visualisation": true,
  "delta": { "width_mm": 3200, "type": "slim-frame sliding/folding concept" },
  "benefit": "stronger public indoor-outdoor axis",
  "risk_level": "unknown",
  "risk": "structural edge, lintel and façade feasibility are unverified",
  "checks": ["structure", "lintel", "facade approval", "wind/rain", "threshold", "fall protection"],
  "conflicts": ["curtain pocket", "HVAC outlet", "storage wall"],
  "fallback": "retain existing opening and use a slimmer replacement frame"
}
```

Record every visible physical change—not only openings—in one `modifications.json`: exterior openings, interior doors, windows, partitions, wet-area layouts and service moves. Each record needs an existing condition, delta, benefit, `risk_level`, risk explanation, checks, conflicts and safe fallback. Allowed `risk_level` values are `low`, `medium`, `high`, and `unknown`; keep `risk` as the human-readable explanation. The live model may let users compare variants, but the render set, material quantities, and default budget must all name the one preferred variant they represent.

## Preflight and asset provenance

For a whole-home or whole-floor scope, `preflight-ledger.json` must cover moisture/mould, demolition hazards, electrical, gas/combustion/CO, smoke/egress/fire, door swings, plumbing/drainage/ventilation, and structure/façade. A room scope must contain at least every category named in `projectConfig.required_preflight_categories`. Use `unknown`, `clear`, `issue`, or `not_applicable` plus the required survey and release role. Unknown is acceptable at concept stage; silently omitting an applicable category is not. Visible status text must match the configured `preflight_status_labels` value for the machine-readable status.

`asset-provenance.json` must have one `assets` entry for every key in the embedded image manifest. Put non-manifest data-URI images and inline SVGs under `direct_visuals`, and bind each visible element with `data-provenance-key`; for example, a plan redrawn from sanitised facts is `{"type":"generated-schematic","origin":"derived from sanitised facts; not the source PDF"}`. Record whether an asset is a plan crop, static 3D preview, plan-specific final render or earlier style reference; whether it contains a face, watermark, source photo or private plan; and the reuse scope. Shared values may live under `defaults`; every `assets` and `direct_visuals` entry inherits those values and must override every exception. State that inheritance rule explicitly in the file. Do not infer rights from successful Base64 embedding, and do not permit an asset that `projectConfig.asset_policy` denies.

## Embedded-asset manifest

`scripts/embed-images.mjs` accepts a JSON object. Paths resolve relative to the manifest file. It accepts supported raster/vector source formats, fully decodes each input within pixel/byte limits, strips metadata, and re-encodes the embedded result as WebP. A matching filename or MIME signature alone is not enough. The script refuses to overwrite an existing output by default; use `--force` only after confirming the exact target is a disposable build artifact and is not the template, manifest, or any source asset.

```json
{
  "planThirdFloor": "../audit/third-floor-plan.webp",
  "previewBird": "../3d/bird-eye.webp",
  "finalLounge": "../renders/lounge-to-balcony.webp"
}
```

The HTML template must contain the marker exactly once:

```html
<script id="embeddedAssets" type="application/json">__EMBEDDED_ASSETS__</script>
```

Build it with:

```bash
node "<skill-root>/scripts/embed-images.mjs" \
  --html work/build/renovation-template.html \
  --manifest work/build/asset-manifest.json \
  --root work \
  --output release/project-floor-renovation.html
```

For a deliberate rebuild of that exact release path, append `--force` after checking the target. Never use it to overwrite an uploaded source or the only copy of a hand-edited template.

Use asset keys in the page through `data-asset="previewBird"` or equivalent deterministic bindings. Run the validator on the release file afterwards.
