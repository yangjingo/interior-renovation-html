"""Sanitise and pack a Blender file before bundling it as an example asset."""

from __future__ import annotations

import sys
from pathlib import Path

import bpy


def cli_args() -> tuple[Path, Path]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 2:
        raise SystemExit("usage: blender --background input.blend --python scripts/sanitize-blender-for-example.py -- output.blend imagen-reference.png")
    return Path(args[0]).resolve(), Path(args[1]).resolve()


def clear_sensitive_custom_properties(block) -> None:
    home_path = str(Path.home()).lower().replace("/", "\\")
    account_name = Path.home().name.lower()
    for key in list(block.keys()):
        if key == "_RNA_UI":
            continue
        value = str(block[key])
        lowered = f"{key} {value}".lower()
        normalized = lowered.replace("/", "\\")
        has_home_path = bool(home_path and home_path in normalized)
        has_account_path = bool(account_name and f"\\users\\{account_name}\\" in normalized)
        if "c:\\users\\" in normalized or "\\users\\" in normalized or has_home_path or has_account_path:
            del block[key]


def main() -> None:
    output_path, imagen_path = cli_args()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0

    # Establish the destination as Blender's `//` base before rewriting paths.
    bpy.ops.wm.save_as_mainfile(filepath=str(output_path), check_existing=False)

    for collection in (bpy.data.images, bpy.data.movieclips, bpy.data.sounds, bpy.data.fonts):
        for item in collection:
            if getattr(item, "filepath", ""):
                item.filepath = f"//packed/{Path(item.filepath).name}"
            for packed in getattr(item, "packed_files", ()):
                packed.filepath = getattr(item, "filepath", "//packed/yj-asset")

    for library in bpy.data.libraries:
        if library.filepath:
            library.filepath = f"//libraries/{Path(library.filepath).name}"

    reference = bpy.data.images.get("yj_imagen_material_reference")
    if reference is None:
        reference = bpy.data.images.load(str(imagen_path), check_existing=True)
        reference.name = "yj_imagen_material_reference"
    reference.use_fake_user = True
    reference.pack()
    reference.filepath = "//references/imagen/yj-material-reference.png"
    for packed in reference.packed_files:
        packed.filepath = reference.filepath

    for material in bpy.data.materials:
        clear_sensitive_custom_properties(material)
        material["imagen_reference"] = "yj_imagen_material_reference"
        material["imagen_reference_role"] = "material tone, roughness, textile response and daylight only"

    for scene in bpy.data.scenes:
        clear_sensitive_custom_properties(scene)
        scene["project_alias"] = "yj"
        scene["imagen_reference"] = "//references/imagen/yj-material-reference.png"
        scene.render.filepath = "//renders/yj-"

    for block in tuple(bpy.data.objects) + tuple(bpy.data.collections) + tuple(bpy.data.worlds):
        clear_sensitive_custom_properties(block)

    for screen in bpy.data.screens:
        for area in screen.areas:
            for space in area.spaces:
                params = getattr(space, "params", None)
                if params is not None:
                    params.directory = b"//"
                    params.filename = ""

    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(output_path), check_existing=False)


if __name__ == "__main__":
    main()
