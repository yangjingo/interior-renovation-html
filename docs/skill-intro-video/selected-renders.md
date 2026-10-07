# Selected Renders

The 2D video uses six existing project renders as three floor-specific pairs. Each pair combines one whole-floor view with one room-level view, so the sequence demonstrates both geometry fidelity and interior character without becoming a generic moodboard.

| Floor | Whole-floor evidence | Room-level evidence | Video role |
|---|---|---|---|
| Floor 1 | `docs/skill-intro-video/remotion/public/selected-renders/floor-1-whole.png` | `docs/skill-intro-video/remotion/public/selected-renders/floor-1-public-axis.png` | Shows the corrected whole-floor structure and the continuous living–dining–glass-kitchen axis. |
| Floor 2 | `docs/skill-intro-video/remotion/public/selected-renders/floor-2-whole.webp` | `docs/skill-intro-video/remotion/public/selected-renders/floor-2-lounge.png` | Shows a distinct second-floor skeleton and the brighter family lounge beside the stair and balcony. |
| Floor 3 | `docs/skill-intro-video/remotion/public/selected-renders/floor-3-whole.png` | `docs/skill-intro-video/remotion/public/selected-renders/floor-3-bath.webp` | Shows the refined third-floor overview and a polished dry/wet-separated bathroom detail. |

Copies used by Remotion live in `remotion/public/selected-renders/`. Keep filenames stable because `SkillIntro.tsx` loads them through `staticFile()`.

## 3D feature reveal

The keynote-style 3D segment uses three fixed-camera Blender top views from `example/output-blender/yj-home-blender-v9-stair-rebuild/review-stair/` for the model feature segment. Browser test screenshots are deleted after verification. Stable render copies live in `remotion/public/3d-showcase/`. The views deliberately preserve each floor's distinct walls, stair relationship, wet areas and furniture layout while sharing one camera language for comparison.
