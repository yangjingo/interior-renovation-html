"""Render comparable whole-floor and material proof screenshots from yj-home."""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def cli_output_dir():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args:
        return Path(args[0]).resolve()
    return Path.home() / 'Pictures' / 'Screenshots' / 'yj-home-material-update'


def cli_mode():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return args[1] if len(args) > 1 else 'all'


def look_at(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def floor_bounds(collection):
    points = []
    for obj in collection.all_objects:
        if obj is None or obj.type != 'MESH' or 'ceiling' in obj.name.lower():
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        raise RuntimeError(f'No mesh bounds found for {collection.name}')
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return minimum, maximum


def set_floor_ceilings(floor_name, hidden):
    short_prefix = f"f{floor_name[-1]}-"
    long_prefix = f'{floor_name}-'
    for obj in bpy.data.objects:
        if obj is None:
            continue
        name = obj.name.lower()
        if 'ceiling' in name and (name.startswith(short_prefix) or name.startswith(long_prefix)):
            obj.hide_render = hidden


def show_all_ceilings():
    for obj in bpy.data.objects:
        if obj is not None and 'ceiling' in obj.name.lower():
            obj.hide_render = False


def configure_output(scene, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False


def render(scene, output_path):
    scene.render.filepath = str(output_path)
    bpy.ops.render.render(write_still=True)
    print(f'RENDERED={output_path}')


def render_overviews(scene, output_dir):
    camera_data = bpy.data.cameras.new('Material Proof Camera')
    camera_data.type = 'ORTHO'
    camera = bpy.data.objects.new('Material Proof Camera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    for index, floor_name in enumerate(('floor-1', 'floor-2', 'floor-3'), start=1):
        collection = bpy.data.collections[floor_name]
        show_all_ceilings()
        set_floor_ceilings(floor_name, True)
        minimum, maximum = floor_bounds(collection)
        centre = (minimum + maximum) * 0.5
        width = maximum.x - minimum.x
        depth = maximum.y - minimum.y
        span = max(width, depth)
        camera_data.ortho_scale = span * 1.12
        floor_level = (index - 1) * 3.2
        camera.location = (centre.x, centre.y, floor_level + 3.08)
        look_at(camera, (centre.x, centre.y, minimum.z))
        render(scene, output_dir / f'0{index}-floor-{index}-whole-material-overview.png')

    bpy.data.objects.remove(camera, do_unlink=True)


def render_details(scene, output_dir):
    camera = bpy.data.objects.get('Walkthrough Camera')
    if camera is None:
        raise RuntimeError('Walkthrough Camera is missing')
    scene.camera = camera
    # Arrival frames from the 25-shot, 600-frame walkthrough.
    shots = (
        ('floor-1', 126, '04-floor-1-glass-kitchen-materials.png'),
        ('floor-2', 276, '05-floor-2-south-balcony-materials.png'),
        ('floor-3', 525, '06-floor-3-study-materials.png'),
    )
    show_all_ceilings()
    for floor_name, frame, filename in shots:
        scene.frame_set(frame)
        render(scene, output_dir / filename)


def main():
    output_dir = cli_output_dir()
    mode = cli_mode()
    scene = bpy.context.scene
    configure_output(scene, output_dir)
    if mode in ('all', 'overview'):
        render_overviews(scene, output_dir)
    if mode in ('all', 'details'):
        render_details(scene, output_dir)
    print(f'OUTPUT_DIR={output_dir}')


if __name__ == '__main__':
    main()
