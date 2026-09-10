# Blender Iterative Modelling and Self-Review

Use this workflow when the user requests an editable `.blend`, a GLB exchange model, Blender room renders, or a later real-time hand-off. It adapts the Astra house case study to this skill's actual starting point: the project already has drawings, QA decisions, floor baselines, room ledgers, style references and often ImageGen renders. Do not restart from a vague text prompt or let Blender redesign the approved plan.

## Entry contract: start from approved evidence

Begin only when these inputs are available:

- `project-config.json` and the routed-input fingerprint;
- one frozen, versioned spatial baseline per designed floor;
- the floor-difference matrix and verified shared building core;
- room dimensions, openings, fixed furniture and unresolved site-measure flags;
- approved proposal variant and user QA decisions;
- floor-specific plan/3D correspondence records;
- a style/material sheet and any selected privacy-safe ImageGen references.

Record the input baseline version in the Blender scene, output manifest and every render record. A free-form mood prompt may explore appearance only; it cannot add, remove or relocate a room, stair, wall, door, window, wet stack or balcony.

## The Blender stage-gate sequence

### 1. Make a recoverable snapshot

Before a major rebuild, save an immutable dated/versioned `.blend` snapshot and duplicate only the working scene. Never overwrite the last approved model. State which floor baseline and proposal variant the new iteration consumes.

### 2. Rebuild the architectural shell per floor

Create a separate collection or linked scene for each floor and a distinct collection for the verified building core. Generate walls, slabs, openings, stairs, balconies and wet zones from that floor's baseline. Do not duplicate another floor's shell and change labels.

First render a same-orientation orthographic top view with a plan overlay. Approve the outline, partitions, openings, stair/core anchor and balcony relationships before furniture, materials or cinematic lighting.

### 3. Check geometry without visual camouflage

Create a reusable `geometry-check` view layer:

- use solid/clay shading and neutral world light;
- disable depth of field and decorative atmosphere;
- temporarily hide roof, foliage and glass where they obstruct inspection;
- inspect wall joins, door/window openings, normals, bevels, cavities and object origins;
- check floating objects, intersections, duplicate coplanar faces and circulation clearance;
- compare plan-facing cameras with the source crop at the same orientation.

Do not accept a beautiful render as proof of correct geometry. A model passes only when the simplified inspection views also pass.

### 4. Add furniture at the required inspection depth

Use real, editable volume for objects that appear in room views or close-ups. Beds need credible mattress and frame dimensions; cabinets need thickness, internal space and usable openings; sinks, basins and vessels need cavities; upholstered pieces need believable edge treatment. Use low-detail proxies for distant objects until the layout is approved.

Build furniture placement from the QA and room ledger. Verify door swings, chair pull-back, bedside access, kitchen work zones and maintenance access before adding decorative objects.

### 5. Translate ImageGen appearance into materials

Treat an ImageGen room render as a visual target, not a texture atlas and never as geometry evidence. Create a material translation sheet:

`visible cue → Blender material → PBR maps → real-world scale → UV/grain direction → roughness/normal values → close-up camera`

Use licensed PBR maps for diffuse/base colour, roughness, normal and displacement where appropriate. Record source, licence, version and hash. Align wood grain to the object construction and keep texture scale consistent with real dimensions. Pack approved assets or preserve verified relative paths.

### 6. Build explainable light

Light in this order: daylight/environment, visible architectural fixtures, then narrowly scoped corrective lights. Every important highlight or shadow should be attributable to a sun/window, HDRI or visible luminaire. Remove undocumented hidden fills that flatten the room. Match the approved reference's warmth and contrast, while preserving legibility and physically plausible exposure.

### 7. Add lived-in detail last

After architecture, furniture and materials pass, add a restrained layer of everyday objects where people would use them. Prefer task-related clusters—table settings at dining seats, a cup and notebook at a desk, toiletries near a basin—over generic scattered clutter. Close-camera props need geometry; distant props may be simplified. They must not hide clearance, drainage, openings or unresolved defects.

### 8. Run the preview-review-fix loop

Automate repeatable builds and fixed cameras with idempotent `bpy` scripts. Use low-sample previews before expensive Cycles output. After every meaningful change:

1. render the plan overlay and `geometry-check` views;
2. render the affected rooms from their registered camera IDs;
3. render material close-ups when surface response changed;
4. inspect the images at fit-to-frame and 100% scale;
5. log each visible defect, repair it and re-render the same camera;
6. accept the iteration only after the repaired evidence replaces the stale preview.

Use this review record:

```yaml
iteration_id: blender-f1-v04
floor_id: floor-1
baseline_version: 3
change_request: "Open the living-dining-kitchen axis; retain the glazed kitchen partition."
frozen_facts: [stair-core, exterior-openings, wet-stack]
camera_ids: [f1-top-ortho, f1-public-axis, f1-kitchen-close]
checks: [plan-overlay, solid-geometry, circulation, material-scale, light-source]
issues:
  - id: B-014
    observed: "Glass track intersects the ceiling return."
    evidence: f1-kitchen-close-preview-02.webp
    fix: "Lower track 18 mm and rebuild the return."
    recheck: pass
outputs: [blend, glb, preview-contact-sheet, review-log]
```

## Automation and deliverables

Prefer a reproducible command such as:

```powershell
blender project.blend --background --python scripts/build-project.py -- --floor floor-1 --baseline 3 --preview
```

The script should be safe to rerun: update named collections, materials, lights and cameras instead of appending duplicates. Save the editable `.blend`, self-contained `.glb` when requested, PBR/provenance manifest, fixed-camera contact sheet and iteration log under the approved `output-blender/` directory. Run privacy sanitisation after the final save.

Animation is optional and is not part of this project's default output. When requested, approve a low-cost animatic before final frame rendering; camera height, focal length and motion style are project choices, not universal constants. Do not substitute a video for the required fixed-camera evidence.

An Unreal or other real-time hand-off is a separate optional phase. Export only after Blender approval, and include explicit unit/axis conversion, material approximations, collision rules, interaction metadata and matched-camera comparison. It does not replace the browser Three.js module required by this skill when `features.interactive_3d` is enabled.

## Acceptance gate

Reject the Blender delivery when any of these are true:

- a floor cannot be traced to its own baseline and plan overlay;
- a floor shell was cloned from another drawing;
- a polished render hides failed solid-mode geometry;
- furniture dimensions or circulation conflict with the QA;
- a complete ImageGen room image is tiled onto model surfaces;
- material scale, UV direction, normals or bevels fail a close-up;
- lighting has no explainable source or removes useful depth;
- the latest change lacks a fresh render and issue recheck;
- native files contain absolute personal paths, unlicensed assets or private metadata.

## Source notes

This staged loop is adapted from the user-supplied Thomas Ricouard house-design account and constrained for plan-backed renovation work. Blender exposes editable scene data through [`bpy`](https://docs.blender.org/api/current/) and supports scripted background work with `--background --python`. OpenAI's [GPT-6 Astra overview](https://openai.com/index/gpt-6-astra/) shows the broader Blender-to-walkable-scene example. Poly Haven assets such as [White Oak Veneer](https://polyhaven.com/a/white_oak_veneer) may provide licensed PBR inputs; still record the exact asset licence and hash used in the project.
