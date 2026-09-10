# Selected Renders

The 2D video uses six existing project renders as three floor-specific pairs. Each pair combines one whole-floor view with one room-level view, so the sequence demonstrates both geometry fidelity and interior character without becoming a generic moodboard.

| Floor | Whole-floor evidence | Room-level evidence | Video role |
|---|---|---|---|
| Floor 1 | `example/output-html/room-renders/floor-1/f1-whole-floor-v2.png` | `example/output-html/room-renders/floor-1/f1-public-axis-v2.png` | Shows the corrected whole-floor structure and the continuous living–dining–glass-kitchen axis. |
| Floor 2 | `example/output-html/room-renders/references/floor2Preview.webp` | `example/output-html/room-renders/floor-2/f2-lounge.png` | Shows a distinct second-floor skeleton and the brighter family lounge beside the stair and balcony. |
| Floor 3 | `example/output-html/room-renders/floor-3/f3-whole-floor-refined.png` | `example/output-html/room-renders/references/floor3FinalBath.webp` | Shows the refined third-floor overview and a polished dry/wet-separated bathroom detail. |

Copies used by Remotion live in `remotion/public/selected-renders/`. Keep filenames stable because `SkillIntro.tsx` loads them through `staticFile()`.

## 3D feature reveal

The keynote-style 3D segment uses three fixed-camera Blender top views from `example/output-blender/yj-home-blender-v9-stair-rebuild/review-stair/` plus a checked screenshot of the HTML 3D module. Stable copies live in `remotion/public/3d-showcase/`. The views deliberately preserve each floor's distinct walls, stair relationship, wet areas and furniture layout while sharing one camera language for comparison.
