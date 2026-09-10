"""Render fixed-camera Blender evidence for the renovation stage gate."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


FLOOR_IDS = ('floor-1', 'floor-2', 'floor-3')
ROOM_CAMERAS = {
    'floor-1': ('floor-1-public-axis', 'floor-1-stair-plan-review', 'floor-1-wet-open'),
    'floor-2': ('floor-2-open-kitchen', 'floor-2-stair-plan-review', 'floor-2-wet-separated'),
    'floor-3': ('floor-3-study', 'floor-3-stair-plan-review', 'floor-3-wet-separated'),
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, required=True)
    return parser.parse_args(argv)


def set_floor_visibility(active_floor):
    for floor_id in FLOOR_IDS:
        collection = bpy.data.collections.get(floor_id)
        if collection is None:
            raise RuntimeError(f'Missing floor collection: {floor_id}')
        hidden = floor_id != active_floor
        for obj in collection.all_objects:
            if obj is None:
                continue
            obj.hide_render = hidden
            previous_floor = {'floor-2': 'floor-1', 'floor-3': 'floor-2'}.get(active_floor)
            if previous_floor == floor_id and obj.get('is_walkthrough_stair'):
                obj.hide_render = False


def set_selected_ceilings(floor_id, hidden):
    prefixes = (f'{floor_id}-', f'f{floor_id[-1]}-')
    for obj in bpy.data.objects:
        if obj is None:
            continue
        name = obj.name.lower()
        if 'ceiling' in name and name.startswith(prefixes):
            obj.hide_render = hidden


def set_environment_hidden(hidden):
    for obj in bpy.context.scene.collection.objects:
        if obj.name == 'Ground' or obj.name.startswith('exterior-plant-'):
            obj.hide_render = hidden


def render_camera(scene, camera_id, path, *, layer='Presentation', transparent=False):
    camera = bpy.data.objects.get(camera_id)
    if camera is None or camera.type != 'CAMERA':
        raise RuntimeError(f'Missing review camera: {camera_id}')
    scene.camera = camera
    scene.render.film_transparent = transparent
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True, layer=layer)
    print(f'RENDERED={path}')


def main():
    args = parse_args()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    if scene.view_layers.get('Presentation') is None or scene.view_layers.get('Geometry Check') is None:
        raise RuntimeError('Strict review view layers are missing')
    scene.render.resolution_x = 960
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    if hasattr(scene, 'eevee'):
        scene.eevee.taa_render_samples = 16
        scene.eevee.taa_samples = 16

    outputs = []
    for floor_id in FLOOR_IDS:
        set_floor_visibility(floor_id)
        set_environment_hidden(True)
        set_selected_ceilings(floor_id, True)

        top_path = output_dir / f'{floor_id}-top-material.png'
        render_camera(scene, f'{floor_id}-top-ortho', top_path)
        outputs.append(top_path.name)

        clay_path = output_dir / f'{floor_id}-top-clay.png'
        render_camera(scene, f'{floor_id}-top-ortho', clay_path, layer='Geometry Check', transparent=True)
        outputs.append(clay_path.name)

        set_environment_hidden(False)
        set_selected_ceilings(floor_id, False)
        for camera_id in ROOM_CAMERAS[floor_id]:
            room_path = output_dir / f'{camera_id}.png'
            render_camera(scene, camera_id, room_path)
            outputs.append(room_path.name)

    for floor_id in FLOOR_IDS:
        set_floor_visibility(floor_id)
        set_selected_ceilings(floor_id, False)
    set_environment_hidden(False)
    scene.render.film_transparent = False
    summary = {
        'version': 1,
        'blend': Path(bpy.data.filepath).name,
        'view_layers': ['Presentation', 'Geometry Check'],
        'outputs': outputs,
    }
    summary_path = output_dir / 'render-summary.json'
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'SUMMARY={summary_path}')


if __name__ == '__main__':
    main()
