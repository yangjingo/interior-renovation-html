# Single-HTML output contract

The normal deliverable is one responsive HTML that can be downloaded and reopened. Keep external project assets out of the dependency chain. In the bundled working example, the canonical current deliverable path is `example/output-html/room.html`; do not scatter competing final HTML files through render or comparison folders.

## Required information architecture

Use these seven tabs by default; put the exact applicable IDs in `projectConfig.required_panels`, and merge or omit only when genuinely irrelevant:

1. **Planning overview** — scope, assumptions, area basis, design thesis, key decisions and circulation.
2. **Plan and zoning** — embedded target-floor CAD/PDF plan crop, zoom, room hotspots, fact/inference labels and a room-by-room explanation for every visible room.
3. **Doors, windows and adjustments** — ranked modifications, recommended dimensions, benefits, risk, prerequisites, fallback and existing/proposed effect visuals for highlighted changes.
4. **Special areas** — balcony, kitchen, bathroom, laundry or another technically important zone.
5. **3D and renders** — interactive Three.js, embedded static previews, paired final renders and collapsed earlier style references.
6. **Materials and budget** — room-by-room systems, practical substitutes, lighting and recalculating low/high budget.
7. **Furniture and sourcing** — dimensions, material/colour, copyable search terms and buy-new/used/custom status.

For multi-floor work, keep the same top-level tabs and add an independent floor selector inside `drawing` and every applicable `openings`, `visuals`, `materials`, and `furniture` panel. In each such panel, include one button with `data-floor-target="<floor-id>"` for every ID in `projectConfig.target.floor_ids`, plus content containers marked `data-floor-container="true"` whose `data-floor-id` values cover the same set. JavaScript must read `floorTarget`, compare it with `floorId`, and toggle the matching content; floor selection is separate from proposal-variant selection. Show the shared building core once, embed `buildingCore` and `floorBaselines`, then keep facts, variants, quantities, and camera views filterable by floor. Do not concatenate unrelated floor pages into an unlabelled gallery.

Mark each top-level per-floor container with `data-floor-container="true"` and `data-floor-id="<floor-id>"`; nested room cards and visual assets may then repeat `data-floor-id` without being mistaken for selector containers. Inside each `drawing` floor container, show content in this order:

1. That floor's actual cropped CAD/PDF plan, with its printed floor label still legible.
2. A short floor identity summary stating what makes this floor different from the others.
3. One user-facing card per visible room or named zone. Each card shows proposed use, dimensions and evidence class, adjacency/circulation, doors/windows, fixed furniture, design explanation and items needing measurement.

Bind the source-plan `<img>` with `data-floor-plan="source"`, `data-floor-id`, `data-source-page-id` and `data-plan-asset-id`. Mark room cards with `data-room-card="true"`, `data-room-id`, `data-floor-id` and `data-source-page-id`. A generated zoning diagram may be placed beside the source plan, but it cannot replace the plan. Do not reuse another floor's plan image, room cards, 3D view or effect render and change only the title.

`features.special_areas` is an array of area keys. Map every key through `projectConfig.special_area_panels` to one of the required panels. Several areas may share a panel—for example, `balcony → balcony` and `wet-area → materials`—and a mapped area does not require a dedicated special-area tab. No named special area may disappear from the visible deliverable.

If a dedicated special-area/重点区域 panel is present, it is a visual decision panel rather than a text appendix. Mark each area card with `data-special-area="<area-key>"`. Every named area card must include at least one visible same-floor image: a source-plan enlargement, baseline-matched 3D detail or final render. Reusing a valid embedded render from another tab is allowed, but it must be rendered again inside this panel with `data-asset`, `data-floor-id`, provenance and visual-correspondence bindings. A heading, paragraph or material list alone does not satisfy the panel.

Every designed floor must also have one complete whole-floor 3D overview marked `data-whole-floor-overview="true"`, the correct `data-floor-id`, and `data-overview-quality="polished"`. When one floor uses a polished furnished dollhouse preview, all floors must use comparable finish, furnishing density, resolution and full-footprint framing. Raw grey/white models may be supplemental geometry evidence only; match another floor's presentation quality, never its topology.

Put safety notes next to the affected decision instead of hiding every limitation in one final disclaimer.

## Interaction matrix

Tab navigation with URL hash state, print/save-to-PDF support, and desktop/tablet/mobile layouts are always required. Other interactions follow the project contract:

| Contract control | Required interaction |
|---|---|
| `features.plan` | Plan zoom/reset, optional annotations, and room/zone selection |
| `features.interactive_3d` | Three.js orbit/pan/zoom, named camera views, responsive resize, and an error/fallback state |
| `minimum_visuals.static_3d > 0` | Embedded static 3D gallery |
| `minimum_visuals.final_renders > 0` | Image lightbox with next/previous and save-current-image |
| `features.budget` | Budget checkboxes and region/price factor |
| `features.sourcing` | Furniture filter and copy-search-term action |
| `features.multi_floor` | Floor selectors independent from proposal-variant controls |
| `features.review_notes` | Draggable review orb, stable anchors, history, import and complete export |

Image downloads use the extension implied by each embedded asset's MIME type; do not hard-code `.webp` for mixed formats.

## Anchored review mode

When `features.review_notes` is true, read [public-review-and-notes.md](public-review-and-notes.md). Add a design-matched orb without removing, replacing or covering the plan or 3D viewer. Reviewable elements carry stable `data-review-anchor` values; image/DOM notes use normalised in-element coordinates, while 3D notes also preserve floor, camera and object/world context. Embed `reviewConfig`, an initially empty or imported `reviewNotes` array, and `releaseManifest` as JSON blocks.

State the storage mode in the drawer. `local_export` stores notes only in the current browser and requires export/import; `remote` requires an explicitly authorised durable backend and access policy. Provide canonical JSON plus readable Markdown and CSV exports, retain append-only history, and turn only explicitly accepted notes into next-version revision requests.

## Evidence blocks

Mark every default deliverable with `data-renovation-contract="v1"` on the root HTML element. The included validator rejects a missing or changed contract marker. Always embed `projectConfig`, `preflightLedger`, and `assetProvenance` so scope, safety status and image origins remain auditable after staging files are removed. When `features.plan` is true, also embed `planFacts`; for a single-floor scope embed `spatialBaseline`, while a multi-floor scope embeds `buildingCore` and `floorBaselines` instead. Embed `modifications` as a JSON array for every plan project; it may be empty only when `features.modifications` is false. Add `data-project-id` to `body`.

For one baseline, add `data-baseline-version` and `data-variant` to each 3D/render and budget panel that exists. For multiple floors, put the exact `buildingCore.version` in `data-building-core-version` on each floor-selectable panel and on every per-floor content container. Each container also carries `data-floor-id`, the matching floor baseline's `data-baseline-version`, and its `data-variant="<preferred_visual_state>"`. Every applicable panel independently covers all target floor IDs in both its controls and containers. The project target, area value/unit/basis and source ID must be visibly stated and must agree with `projectConfig.target`.

`projectConfig` is the contract profile: target and area basis, applicable panels, plan/modification/3D/budget/sourcing flags, special-area mappings, visual minimums, locale/currency, required preflight categories, optional budget categories, vertical assumptions, project ID, and a sanitised SHA-256 input fingerprint. Real deliverables use `is_golden_example: false`. The validator refuses the bundled golden identity—its sentinel, fixed project ID, or known fingerprint—unless the explicit `--allow-golden-example` test flag is supplied. That flag permits example testing only and never skips the remaining checks.

When those features exist, the visible facts table must expose every source ID with page/region, class, confidence, and an explicit yes/no site-measure status, and the visible modification table must expose every modification ID. Multi-floor deliverables also embed `roomLedgers` and `visualCorrespondence`; bind visible room cards with `data-floor-id`, `data-room-id` and `data-source-page-id`, and bind every static 3D/render with its correspondence asset ID. Show every configured preflight category and its current status in the HTML. Do not rely on captions alone as the audit trail.

## Embedding and offline behaviour

- Compress plan pages, static 3D previews and final renders to WebP where practical.
- Embed project images as data URIs inside the HTML.
- Give every direct `<img src="data:image/...">` and inline SVG a `data-provenance-key` that resolves to `assetProvenance.direct_visuals`; manifest-backed images continue to use their manifest key. A derived plan SVG should be labelled `generated-schematic`, never `source plan`.
- Embed a cropped or redacted source-plan view for every designed floor. It may contain private drawing geometry only when the user/private-use basis allows it; remove unrelated title-block data where practical. Do not silently replace it with a generated schematic. Do not embed the raw style reference by default.
- Do not depend on a neighbouring image folder.
- Add a restrictive Content Security Policy: deny network connections, frames, objects, forms and base-URL changes; allow only embedded images/styles/scripts plus the pinned Three.js host when live 3D is enabled. `local_export` review mode keeps `connect-src 'none'`; remote review mode allows only its exact approved same-origin or HTTPS API origin.
- A pinned Three.js CDN may be used by default. Its failure must not break tabs, galleries, budget or sourcing interactions.
- Keep the classic UI/gallery script independent from the Three.js module.
- Show a clear fallback message and embedded static 3D previews when interactive 3D cannot load.
- If the user requests completely offline 3D, inline the permitted dependency files and accept a larger artifact.

The bundled golden HTML may be reused as a presentation and interaction scaffold, but never as a geometry scaffold. Replace its plan data, coordinate model, visual assets, dimensions, budget, and text for every new project. Generate a new project ID and sanitised-input fingerprint, set `is_golden_example: false`, and validate the real deliverable without `--allow-golden-example`.

For a highlighted door or window change, the `openings` panel must include at least one floor-specific existing/proposed visual pair. Use matched plan enlargements, matched 3D views or plan-faithful effect renders so the user can see what changes; text and a dimensions table alone are insufficient. Keep camera direction and surrounding geometry consistent between the pair.

## Visual shell

When no UI guide is supplied, use a restrained warm editorial system:

- Warm cream canvas and dark warm ink.
- One scarce rust/coral accent.
- Serif display headings with humanist sans body.
- Generous whitespace and low icon density.
- Cream content cards alternating with occasional dark visual surfaces.
- Hairline borders and rare, low-alpha shadows.

For an explicit editorial, architectural-magazine, catalogue, or broadsheet direction, read [magazine-style-sources.md](magazine-style-sources.md). Build an original renovation shell from the documented principles: asymmetric image-led spreads, folio and evidence labels, restrained serif hierarchy, functional sans or mono metadata, paper/dark chapter contrast, and minimal camera-like motion. Do not clone a referenced brand, download its proprietary font, or let the visual treatment obscure plans, dimensions, 3D controls, per-floor identity, provenance, or review anchors.

If the user does not like the proposed visual shell, stop making unguided style variations. Invite them to browse [Refero Styles](https://styles.refero.design/) or [getdesign.md](https://getdesign.md/) and choose a design direction they genuinely like. Ask for one primary style page URL or screenshot, optionally one supporting reference, plus a short note naming the parts they like: colour, typography, layout, imagery, motion, or overall mood. Convert those preferences into original project tokens and show a small cover-and-room-spread preview for approval before restyling the complete HTML.

Suggested user-facing wording: “如果现在的页面风格不是你喜欢的，可以去 Refero Styles 或 getdesign.md 找一套你喜欢的 DESIGN 方案。把具体页面链接或截图发给我，再告诉我最喜欢它的颜色、字体、排版、图片方式或动效；我会把这些特点转换成适合你家装修内容的原创页面方案。”

Motion may take behaviour references from the official [Amicro gallery](https://amicro.vercel.app/) and [repository](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/README.md). A React/Tailwind/Motion project may add an individually approved component with the official CLI after inspecting its source and dependencies. A standalone single-file deliverable must reproduce the chosen behaviour with local CSS/JavaScript and must not import a React runtime just for motion. Historical versions may use card-carousel behaviour only after the active floor's primary 3D viewer; never remove, replace or obstruct the viewer, plan controls, note anchors or export actions. Prevent mobile autoplay and provide a complete `prefers-reduced-motion` fallback.

If the motion itself is unsatisfactory, ask the user to choose one Amicro component and return its name, link, screenshot or short recording. Confirm that single interaction on a representative section before applying it across the report.

An uploaded UI design specification overrides this default. A hand-drawn diagram specification applies only to explanatory diagrams, not to the main UI or photorealistic renders, unless the user explicitly says otherwise.

## Content labels

Every dimensional statement should be recognisable as one of:

- `drawing` — printed or unambiguous.
- `inferred` — calculated from drawing evidence.
- `proposal` — introduced by the design.
- `site measure` — must be checked before ordering or construction.

Every final render affected by an unverified opening must say that the opening is conceptual pending structural/façade review.

## Budget contract

This section applies when `features.budget` is true.

- Currency, date, floor area and region factor are visible.
- Low/high totals update from selected rows. Put unscaled numeric defaults in `data-default-low` and `data-default-high` on the visible total so any currency/unit can be verified without parsing locale-specific prose.
- Contingency is explicit.
- Inclusions and exclusions are visible near the total.
- Door/window upgrades, structural assessment, HVAC and appliances remain separate optional or disabled `TBD` rows when uncertain. Tag them with stable `data-budget-category` values. A zero-value TBD row must be disabled and visibly say it is excluded from the total.
- Do not display false unit-price precision.

## Final response

Return:

- A clickable download link to the single HTML.
- Selected floor and area basis.
- Tabs and visual count.
- Two or three most important planning decisions.
- Items requiring site measurement, structural review or local approval.
- Whether interactive 3D requires a network connection.
- Important budget exclusions.
- Public-review URL, note storage mode and how to export the complete discussion when review mode is enabled.

Do not call the artifact a construction drawing, structural appraisal, approval package, or contractor quotation.
