# Magazine-style sources

Use this reference when the requested renovation HTML should feel editorial, architectural, or magazine-like. These sources provide observable design principles only. Do not copy their artwork, logos, proprietary fonts, source code, or full page composition.

## Reviewed sources

Reviewed on 2026-09-07.

- [Refero Styles](https://styles.refero.design/) — searchable, AI-readable design-system examples covering colour, typography, spacing, and components.
- [Monad on Refero Styles](https://styles.refero.design/style/fc84e9f0-2058-4a0a-8d26-9cc1ba84ec9c) — warm paper canvas, restrained serif display text, functional mono labels, hairline rules, and a single scarce accent.
- [Structured on Refero Styles](https://styles.refero.design/style/6c0b77d3-71f9-469d-98aa-4ce1d6d76ac8) — museum-catalogue hierarchy, warm neutral surfaces, large editorial type, flat sections, and deliberate light/dark chapter changes.
- [getdesign.md](https://getdesign.md/) — DESIGN.md analyses intended to keep AI-built pages within a specific reusable visual language.
- [WIRED analysis on getdesign.md](https://getdesign.md/wired/design-md) — paper-like broadsheet density, serif display type, mono uppercase kickers, image-led story modules, and one link accent.
- [Amicro gallery](https://amicro.vercel.app/) — an interaction reference for buttons, text reveals, card spreads, carousels, progress indicators, and other focused micro-transitions.
- [Amicro repository and CLI](https://github.com/Subhan-code/Amicro--Micro-transitions-/blob/main/README.md) — the authoritative source for component names, installation commands, framework requirements, and licence information.

The linked analyses are independent references and do not imply endorsement by the original brands.

## Renovation editorial direction

Translate the source principles into an original architectural-magazine system:

- **Canvas:** warm mineral paper, such as `#f2eee6`; never use pure white as the dominant page surface.
- **Ink:** near-black `#1d1b18`, muted text `#6d675f`, hairline `#cec6ba`, and one scarce rust accent `#a34f35` for active state or decision emphasis.
- **Type:** high-contrast serif for titles and room names; readable humanist sans for paragraphs; compact mono only for floor IDs, dimensions, evidence labels, and drawing coordinates. Use licensed local or system fallbacks.
- **Grid:** a 12-column desktop spread with asymmetric image/text ratios, margin notes, folio numbers, and deliberate whitespace. Collapse to one readable column below `760px`.
- **Images:** let plans, 3D views, and room renders carry the page. Prefer one dominant image plus one supporting detail over equal-sized card grids. Keep plan aspect ratios and use captions as evidence, not decoration.
- **Surfaces:** alternate paper sections with occasional full-width charcoal visual chapters. Use borders and tonal changes for hierarchy; avoid generic floating cards, heavy shadows, and repeated rounded containers.
- **Motion:** reveal sections with restrained opacity, light, and `8–18px` camera-like drift. Do not use opaque ochre highlight rectangles. Honour `prefers-reduced-motion` and never animate plan geometry away from its measured position.

## Motion references: Amicro

Use Amicro as a vocabulary of interaction behaviours, not as a mandatory dependency. Its packaged components target React with Tailwind and Motion/Framer Motion. In a compatible application, add only the approved component—for example, `npx @subhanhq/amicro@latest add card-carousel`—then inspect the copied source, dependencies, accessibility and licence before adapting it. For a standalone renovation HTML, implement the selected behaviour locally with small CSS and JavaScript; do not add React solely for animation.

Recommended translations:

- Use `fade-up` or text-reveal behaviour for chapter introductions, with restrained opacity and light rather than a coloured blocking rectangle.
- Use gentle tilt only for mood or render cards. Never tilt, distort or shift a CAD plan, measured annotation, interactive 3D canvas or evidence table.
- Use card-carousel behaviour for retained historical renders after the active floor's primary 3D viewer. It must not replace the viewer or appear before it.
- Use scroll progress for long chapters and compact button feedback for review, export and copy actions.
- Reserve spring motion for the draggable review orb and directly manipulated carousels. Avoid bounce on plans, budgets and technical data.

Keep entrances around `320–520ms`, stagger related items by `50–90ms`, and keep hover feedback around `140–220ms`. Limit travel to `18px` and hover scale to `1.02`. Disable transform-heavy motion, autoplay and smooth scrolling under `prefers-reduced-motion`; do not autoplay 3D card spreads or CoverFlow on mobile.

## Required editorial modules

- A cover spread with project title, scope, floor count, evidence status, and one primary overview.
- A contents rail or chapter index that preserves hash navigation.
- One independent chapter per floor; begin with its source plan and primary 3D viewer before history or mood imagery.
- Room spreads using a stable `floor_id`, `room_id`, baseline version, camera ID, and provenance key.
- Margin-note styling for `drawing`, `inferred`, `proposal`, and `site measure` labels.
- Full-width chapter breaks for openings, special areas, materials, and budget; do not hide required technical content for visual purity.
- A mobile review orb and review anchors that remain readable and draggable without covering controls.

## When the user wants a different design

Do not keep guessing after the user rejects the first visual direction. Ask them to browse [Refero Styles](https://styles.refero.design/) or [getdesign.md](https://getdesign.md/) and return:

1. One primary DESIGN page URL or screenshot they genuinely like.
2. Optionally one supporting reference for a single missing quality, such as an [Amicro](https://amicro.vercel.app/) component for motion or a page for image treatment.
3. The specific qualities to preserve: colour, type, layout, imagery, motion, density, or mood.
4. Anything they dislike in the selected reference.

Translate the answer into an original project style brief. Confirm a small sample containing the cover and one representative room spread before applying the new direction to the full HTML. Never combine several unrelated references into an unapproved hybrid.

Suggested user prompt: “如果现在的设计不是你喜欢的，可以去 Refero Styles 或 getdesign.md 找一套自己喜欢的 DESIGN 方案；动效也可以从 Amicro 选一个具体组件。把页面链接、组件名称或截图发给我，并说一下最喜欢和最不喜欢的部分；我会先做封面和一个房间跨页给你确认。”

## Adaptation boundaries

The magazine shell controls presentation only. The source plan still controls geometry, user answers control requirements, and qualified professionals control structural or regulatory release. Every floor keeps its own plan, spatial baseline, 3D scene, renders, and captions. A striking spread is invalid if it obscures dimensions, removes the interactive 3D module, breaks local-file navigation, or weakens review-note anchors.
