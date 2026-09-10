# How to use this skill

## What the user uploads

Ask the user to attach the files directly in the same conversation:

1. **CAD-exported PDF** — preferably vector, dimensioned, with floor/page labels. A multi-page whole-building set is useful even when only one floor is being designed.
2. **One or more style references** — photos, renders, moodboards, or a written style description. These define atmosphere, not geometry.
3. **Requirements** — target floor(s), each floor's intended role, household, room functions, must-keep items, changes that may be explored, fixed furniture sizes, budget/city, and whether the final 3D must work fully offline.

Optional inputs include site photos, structural drawings, MEP drawings, north/orientation, ceiling height, window sill heights, view/noise information, and a preferred UI or diagram guide.

### Recommended three-file package

For a one-shot workflow without reconstructing a long conversation, place exactly these three primary files in one `input/` folder:

1. `plan.pdf` (or one clear dimensioned plan image) for geometry.
2. `style-reference.png` for atmosphere and material language.
3. `DESIGN.md`, completed by the user as a plain-language renovation questionnaire.

Give the user [`../templates/DESIGN.template.md`](../templates/DESIGN.template.md) to fill in. It asks practical questions about rooms, furniture sizes, bathroom choices, balcony use, preferred materials, budget, and desired output. Do not expose internal schemas or agent instructions in this questionnaire. Supplementary structural or MEP evidence may still be added when available.

## Invocation

Use the skill name explicitly:

```text
使用 $interior-renovation-html，基于我上传的 CAD PDF 和风格参考，规划第三层。
目标是宽敞、舒适的极简空间；保留三个阳台，可评估门窗微调；需要 3D、最终效果图、材质预算、家具搜索词和一个可下载 HTML。
```

A more complete request can use this template:

```text
使用 $interior-renovation-html。
范围：[整屋 / 第几层 / 哪些房间]
常住者与功能：[人数、卧室、书房、游戏、客房、收纳等]
必须保留：[楼梯、阳台、承重墙、已有设备等]
可讨论改动：[门窗、非承重隔墙、厨卫布局等]
固定尺寸：[床垫、桌子、餐桌、沙发、设备]
预算与地区：[币种、城市、预算区间]
交付：[是否需要 3D、效果图、预算、采购清单、完全离线]
```

Do not require the user to repeat facts already present in the conversation or files. If only low-impact details are missing, state defaults and proceed. Ask a focused question only when it changes geometry, safety, cost, or the deliverable.

## What happens after invocation

1. The agent inventories and routes every input.
2. After scope is resolved, it creates a project contract with a new project ID, applicable features/panels, locale, budget basis and vertical assumptions; it fingerprints the sanitised routed-input manifest, and a real job always sets `is_golden_example: false`.
3. It inspects every plan page, maps printed floor labels to pages, and embeds a cropped source-plan view for every designed floor.
4. It compares the floors, then produces separate floor facts and a user-facing explanation for every room.
5. It freezes one independent spatial baseline per floor plus one verified shared building core.
6. It builds and checks floor-specific 3D before generating same-floor final room renders and door/window comparisons.
7. It translates the style into practical dry, wet, and outdoor material systems.
8. It adds budget ranges and room-by-room sourcing keywords when requested.
9. It assembles and validates one downloadable HTML.

The agent should provide concise progress updates at meaningful milestones. Structural or regulatory uncertainty is not a reason to abandon the concept; it is a reason to label the proposal, preserve a safe fallback, and identify the professional check required.

## Expected hand-off

The final response normally contains one checked HTML download link and a short note stating:

- selected floor(s), per-floor area basis and source pages;
- included tabs and visual count;
- major planning decisions;
- network/offline behaviour;
- budget scope and exclusions;
- door, window, structural, waterproofing, and site-measure items that remain conditional.

The HTML is a concept and decision package. It does not replace measured drawings, structural calculations, permit documents, MEP design, tender drawings, or a contractor quotation.

## Using the bundled example

Read [example-third-floor.md](example-third-floor.md), then compare its manifest, project contract, normalised requirements, sanitised source extracts, and checked output. The example demonstrates how to reject an obsolete generic model, correct a dimension-chain error, keep three balcony types distinct, and pair 3D previews with plan-specific final renders.

When reusing the example, copy only its presentation and interaction patterns. Replace the plan facts, baseline, modifications, visuals, text, budget and sourcing data; create a new project ID and fingerprint; set `is_golden_example: false`; then run the normal validator without `--allow-golden-example`. The flag is only for testing the bundled golden file.
