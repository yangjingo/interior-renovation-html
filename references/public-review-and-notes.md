# Public preview and anchored review notes

Read this reference when a renovation HTML will be shared through Vercel or when reviewers need to leave location-aware design notes. Public deployment and shared persistence are separate capabilities: a public static URL does not by itself make notes visible across devices.

## Release modes

Choose and state one mode before building the review UI:

| Mode | Visibility | Note storage |
|---|---|---|
| Local hand-off | Downloaded HTML | Browser storage plus export/import |
| Public static review | Vercel preview or named site | Browser storage plus export/import |
| Shared review | Public site with an approved API | Durable server storage with access control |

Default to `local_export`. Label it visibly as `本机草稿`; the reviewer must export and send the review package. Never imply that local-storage notes will appear on another phone. Add a remote backend only when the user authorises the extra service, data retention and access policy.

## Fast Vercel hand-off

Use the installed `vercel-deploy` skill for the actual deployment. It controls authentication, preview-versus-production authority and the no-auth fallback.

1. Build and validate the checked renovation HTML first. Do not debug the design in a live deployment.
2. Create a minimal staging directory named `<project-slug>-home/`. Put the checked HTML at `index.html`; copy only runtime assets that were not embedded.
3. Never upload raw CAD/DWG/PDF files, unsanitised title blocks, addresses, faces, or working directories merely to make a plan image appear. Publish the redacted plan crop already approved by `asset_policy`.
4. Create `release-manifest.json` before deployment. Record the project ID, release ID, baseline versions by floor, SHA-256 and byte size of `index.html`, embedded-asset count, optional public-file hashes and privacy review result.
5. Compare the checked HTML and staged `index.html` hashes. If they differ, stop and restage. Confirm every source-plan crop, static fallback and render decodes from the staged copy; reject `file://`, drive-letter and parent-directory references.
6. Deploy a public preview explicitly:

   ```bash
   vercel deploy <staging-dir> -y --target preview
   ```

7. Create a stable `<project-slug>-home.vercel.app` production address only when the user explicitly requests a permanent public URL:

   ```bash
   vercel deploy <staging-dir> --prod -y
   vercel alias set <deployment-host> <project-slug>-home.vercel.app
   ```

8. Check the named project's protection before describing the address as public:

   ```bash
   vercel project protection <project-name> --format json
   ```

   A non-null `ssoProtection` means an unauthenticated phone can still be blocked even when the alias and deployment are healthy. If the user explicitly requested unrestricted public review, disable SSO for that project only, then run the inspection again:

   ```bash
   vercel project protection disable <project-name> --sso
   vercel project protection <project-name> --format json
   ```

   Do not silently weaken organisation-wide protection, password protection, or another Vercel project.

9. Return the base URL and a direct review URL such as `/#visuals`. State whether login is required. Do not remove earlier aliases or deployments unless the user explicitly authorises that deletion and the exact project/deployment IDs have been verified.

The deployment bundle protects drawing availability by carrying approved plan imagery with the HTML; it does not grant permission to publish the original drawing. Preserve private originals outside the release directory.

## Review-orb design

When `features.review_notes` is true, add a small draggable review orb and an anchored-notes drawer. It is a design-review control, not a generic customer-service bubble.

- Use existing page tokens for colour, type, border, shadow and motion. Default size is 44 px desktop and 48 px touch; keep the accent scarce and the icon simple, such as a pin plus pencil.
- Start near the lower-right safe area without covering navigation, budget totals, lightbox controls or the Three.js toolbar. Clamp dragging to the viewport and persist the normalised orb position.
- Separate click from drag with a small movement threshold. A click opens the notes drawer; dragging only repositions the orb.
- The drawer is at most 380 px wide on desktop and becomes a bottom sheet on small screens. It includes `添加标注`, `当前区域`, `全部讨论`, `历史版本`, `导入` and `导出`.
- Support keyboard activation, visible focus, `aria-label="设计讨论与标注"`, reduced motion and a touch target of at least 44 px.
- Do not intercept orbit, pan, zoom or floor-switch controls when the drawer is closed. Pins sit in an overlay layer and must not change document layout.

## Stable anchors

Every reviewable section, plan, render, room card and 3D viewer needs a stable `data-review-anchor`. Never store a generated `nth-child` selector.

For a DOM, plan or image note, store:

- `anchor_id`, panel/hash, `floor_id`, optional `room_id` and baseline version.
- Normalised `x_ratio` and `y_ratio` inside the anchor rectangle so pins survive responsive resizing.
- The active proposal variant and visible asset/correspondence ID where applicable.

For a Three.js note, also store the active camera preset and camera transform. Prefer a raycast result containing `object_id` and `world_position`; retain canvas ratios as the fallback. Opening a 3D note must switch to the recorded floor, restore its camera, reveal the relevant object or screen position and then show the thread. A screen coordinate without floor and camera state is not a valid 3D anchor.

Example HTML target:

```html
<div
  class="viewer-shell"
  data-review-anchor="visuals-3d-floor-2"
  data-floor-id="floor-2"
  data-baseline-version="3"
></div>
```

## Note record

Use append-only events for auditability; edits create a new event rather than silently replacing the previous text.

```json
{
  "note_id": "note-018f...",
  "project_id": "family-house",
  "release_id": "release-2026-09-04-v3",
  "floor_id": "floor-2",
  "baseline_version": 3,
  "panel_id": "visuals",
  "anchor": {
    "type": "three",
    "anchor_id": "visuals-3d-floor-2",
    "x_ratio": 0.62,
    "y_ratio": 0.41,
    "object_id": "f2-kitchen-glass-door",
    "world_position": [4.2, 1.4, 7.8],
    "camera_id": "f2-public-axis",
    "camera_state": {"position": [9, 8, 11], "target": [4, 0, 6]}
  },
  "author": {"display_name": "Reviewer"},
  "body": "这里是否保留整片透明玻璃门？",
  "status": "open",
  "decision": null,
  "created_at": "2026-09-04T07:00:00Z",
  "events": [
    {"type": "created", "at": "2026-09-04T07:00:00Z", "body": "这里是否保留整片透明玻璃门？"}
  ]
}
```

Allowed statuses are `open`, `answered`, `accepted`, `rejected` and `resolved`. Render note text with `textContent`, enforce a reasonable length limit and never execute reviewer HTML.

## History, import and export

The drawer must show notes grouped by release, floor and panel. Filters cover current area, open items, accepted changes, resolved items and all history. Clicking a history item restores its anchor context. Never delete resolved discussion from the canonical history; hide it through filters.

The canonical export is `review-notes.json`. Also provide:

- `review-notes.md` for readable discussion and decisions.
- `review-index.csv` for note ID, release, floor, room, anchor, status, author and timestamps.
- Optional PNG snapshots for visual context when the browser can capture the target without losing the 3D state.
- `release-manifest.json` so imported notes can be checked against the project and baseline versions.

An `导出全部` action downloads all supported files or one ZIP when the ZIP dependency is already bundled. Import must validate schema, project ID and release/baseline compatibility; a mismatch is shown to the user and is never silently merged.

## Turning review into the next version

Use this controlled loop:

`anchored note → discussion → explicit decision → revision request → affected-floor rebuild → new release → resolved-in link`

- Only `accepted` notes become `revisionRequests[]`; questions and suggestions do not mutate the design automatically.
- A revision request records affected floor/room/anchor IDs, decision text, author, source note IDs, target baseline and safety/site-measure impact.
- Drawing facts remain immutable. If feedback proves a drawing transcription wrong, correct it as a sourced baseline revision rather than a design preference.
- Increment only affected floor baseline versions, then regenerate every dependent 3D view, render, budget and schedule before publishing the next release.
- Keep the old release and note history addressable. Mark each completed note with `resolved_in_release_id` and link it to the new visual or modification ID.

## Validation

Before release, verify:

- The staged HTML hash and asset counts match `release-manifest.json`.
- Every designed floor still shows its approved source-plan crop and independent 3D/static fallback.
- The orb can be clicked and dragged on desktop and touch without blocking core controls.
- A note survives reload in `local_export` mode, focuses the same DOM/image anchor after resize, and restores the right floor/camera for a 3D anchor.
- History filters, JSON/Markdown/CSV export and JSON import work with non-ASCII text.
- The UI clearly states whether notes are local-only or shared.
- The Vercel protection check matches the promised audience: `ssoProtection` must be null for a public link intended to open on an unauthenticated phone.
- Public pages contain no unapproved private drawing data, secrets, API tokens or raw reviewer HTML.

## Mobile link troubleshooting

If a Vercel URL works on the deployment owner's computer but not on another phone, check project protection before changing the HTML or asset paths. A Vercel sign-in page or access challenge usually indicates SSO protection; it is not caused by the `#drawing` or `#visuals` hash. After an authorised project-level SSO change, resend the same `https://` URL and open it in Safari or Chrome. Treat missing plan images, a blank Three.js canvas, and a Vercel login challenge as separate failure classes.
