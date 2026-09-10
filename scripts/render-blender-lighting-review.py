"""Render fixed cameras for the versioned lifestyle-lighting review."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


CAMERAS = {
    'floor-1': ('floor-1-public-axis', 'v8-floor-1-bedroom-lighting'),
    'floor-2': ('floor-2-open-kitchen', 'v8-floor-2-bedroom-lighting'),
    'floor-3': ('floor-3-study', 'v8-floor-3-bedroom-lighting'),
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--camera-id')
    return parser.parse_args(argv)


def set_floor_visibility(active_floor):
    for floor_id in CAMERAS:
        collection = bpy.data.collections.get(floor_id)
        if collection is None:
            raise RuntimeError(f'Missing floor collection: {floor_id}')
        hidden = floor_id != active_floor
        for obj in collection.all_objects:
            if obj is not None:
                obj.hide_render = hidden


def render_camera(scene, camera_id, path):
    camera = bpy.data.objects.get(camera_id)
    if camera is None or camera.type != 'CAMERA':
        raise RuntimeError(f'Missing review camera: {camera_id}')
    scene.camera = camera
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True, layer='Presentation')
    print(f'RENDERED={path}')


def main():
    args = parse_args()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.resolution_x = 720
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    outputs = []
    for floor_id, camera_ids in CAMERAS.items():
        selected = tuple(camera for camera in camera_ids if not args.camera_id or camera == args.camera_id)
        if not selected:
            continue
        set_floor_visibility(floor_id)
        for camera_id in selected:
            path = output_dir / f'{camera_id}.png'
            render_camera(scene, camera_id, path)
            outputs.append(path.name)
    summary = {
        'version': 1,
        'blend': Path(bpy.data.filepath).name,
        'lighting_version': 8,
        'camera_ids': [camera for cameras in CAMERAS.values() for camera in cameras if not args.camera_id or camera == args.camera_id],
        'outputs': outputs,
    }
    summary_path = output_dir / ('render-summary.json' if not args.camera_id else f'{args.camera_id}-summary.json')
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'SUMMARY={summary_path}')


if __name__ == '__main__':
    main()
