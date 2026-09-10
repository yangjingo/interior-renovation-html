# Source provenance and sanitisation

This golden example is derived from the current interior-planning conversation.

The original input set included:

- a three-page CAD-exported residential plan PDF;
- one warm rough-concrete bedroom style image carrying a third-party platform watermark and exterior view;
- conversational requirements developed across the planning, 3D, materials, budget, furniture, and HTML stages;
- a warm editorial UI guide;
- a hand-drawn Excalidraw visual guide;
- an unrelated animated Excalidraw/Synapse skill file.

For the reusable package:

- the original PDF is replaced by extracted facts, a coordinate baseline, and a schematic plan;
- the original style photo is replaced by an observable-style brief;
- the UI and diagram documents are distilled into a short presentation brief;
- the unrelated skill file is listed as ignored and is not copied;
- user-identifying strings are removed from the HTML text;
- every embedded generated image key is accounted for in `asset-provenance.json`;
- plan and style source rights remain with their respective owners.

The source originals should be used only in the private project conversation unless the user explicitly has and grants the right to publish them.
