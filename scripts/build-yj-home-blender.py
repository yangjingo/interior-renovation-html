#!/usr/bin/env python3
"""Build the three-floor yj-home Blender model from the deployed HTML baselines.

Run through Blender, for example:
  blender --background --python scripts/build-yj-home-blender.py -- --render-video
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector


FLOOR_HEIGHT = 3.2
WALL_HEIGHT = 2.8
SLAB_HEIGHT = 0.18
WALL_THICKNESS = 0.16
EXTERIOR_WALL_THICKNESS = 0.24
EPSILON = 0.002
PBR_ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'blender-pbr' / 'polyhaven'
STRICT_REVIEW = False


def parse_args() -> argparse.Namespace:
    script_path = Path(__file__).resolve()
    skill_root = script_path.parents[1]
    repository_root = skill_root.parent
    default_output = repository_root / 'deploy' / 'yj-home'
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-html', type=Path, default=default_output / 'index.html')
    parser.add_argument('--output-dir', type=Path, default=default_output)
    parser.add_argument('--frames', type=int, default=900)
    parser.add_argument('--fps', type=int, default=30)
    parser.add_argument('--render-stride', type=int, default=1, help='Render every Nth timeline frame and reconstruct the final FPS with FFmpeg interpolation.')
    parser.add_argument('--render-video', action='store_true')
    parser.add_argument('--render-existing', action='store_true', help='Render the already-open .blend without rebuilding geometry.')
    parser.add_argument('--preview', action='store_true', help='Use a short low-sample validation render.')
    parser.add_argument('--iteration-only', action='store_true', help='Save the rebuilt .blend for visual audits without exporting final GLB, poster, video or manifest.')
    parser.add_argument('--adaptive-render', action='store_true', help='Render every moving camera frame and reuse exact stills during dwell segments; avoids optical-flow ghosts.')
    parser.add_argument('--render-samples', type=int, help='Override Eevee temporal render samples for video or final output.')
    parser.add_argument('--artifact-stem', default='yj-three-floor-walkthrough', help='Kebab-case output filename stem.')
    parser.add_argument('--strict-review', action='store_true', help='Add fixed review cameras and remove undocumented ambient fill lights.')
    return parser.parse_args(argv)


def extract_json_script(html: str, script_id: str):
    pattern = rf'<script\s+id=["\']{re.escape(script_id)}["\']\s+type=["\']application/json["\']>([\s\S]*?)</script>'
    match = re.search(pattern, html, re.IGNORECASE)
    if not match:
        raise RuntimeError(f'Missing JSON script: {script_id}')
    return json.loads(match.group(1))


def clear_scene() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def rgba(hex_value: str, alpha: float = 1.0):
    value = hex_value.lstrip('#')
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (alpha,)


def make_material(name: str, colour: str, *, roughness=0.55, metallic=0.0, alpha=1.0, transmission=0.0, emission=None, emission_strength=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = rgba(colour, alpha)
    material.use_nodes = True
    principled = material.node_tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = rgba(colour, alpha)
    principled.inputs['Roughness'].default_value = roughness
    principled.inputs['Metallic'].default_value = metallic
    if 'Alpha' in principled.inputs:
        principled.inputs['Alpha'].default_value = alpha
    if 'Transmission Weight' in principled.inputs:
        principled.inputs['Transmission Weight'].default_value = transmission
    elif 'Transmission' in principled.inputs:
        principled.inputs['Transmission'].default_value = transmission
    emission_input = principled.inputs.get('Emission Color') or principled.inputs.get('Emission')
    if emission and emission_input:
        emission_input.default_value = rgba(emission)
    if 'Emission Strength' in principled.inputs:
        principled.inputs['Emission Strength'].default_value = emission_strength
    if transmission or alpha < 1:
        material.diffuse_color = rgba(colour, alpha)
        if hasattr(material, 'surface_render_method'):
            material.surface_render_method = 'BLENDED'
        elif hasattr(material, 'blend_method'):
            material.blend_method = 'BLEND'
        if hasattr(material, 'use_screen_refraction'):
            material.use_screen_refraction = True
    return material


def add_procedural_finish(material, *, scale=5.0, detail=4.0, bump=0.08, distortion=0.0, colours=None, stretch=None):
    """Add subtle generated-coordinate variation so large surfaces do not read as flat clay."""
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get('Principled BSDF')
    coordinates = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '3D'
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = detail
    noise.inputs['Roughness'].default_value = 0.62
    noise.inputs['Distortion'].default_value = distortion
    if stretch:
        mapping.inputs['Scale'].default_value = (*stretch, 1.0)
    links.new(coordinates.outputs['Generated'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    height_output = noise.outputs['Fac']
    if colours:
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = rgba(colours[0])
        ramp.color_ramp.elements[1].color = rgba(colours[1])
        ramp.color_ramp.elements[0].position = 0.28
        ramp.color_ramp.elements[1].position = 0.74
        links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
        links.new(ramp.outputs['Color'], principled.inputs['Base Color'])
        height_output = ramp.outputs['Color']
    if bump:
        bump_node = nodes.new('ShaderNodeBump')
        bump_node.inputs['Strength'].default_value = bump
        bump_node.inputs['Distance'].default_value = 0.08
        links.new(height_output, bump_node.inputs['Height'])
        links.new(bump_node.outputs['Normal'], principled.inputs['Normal'])
    return material


def load_texture_image(file_name: str, *, non_color=False):
    image_path = PBR_ROOT / file_name
    if not image_path.is_file():
        raise RuntimeError(f'Missing PBR texture: {image_path}. Run scripts/fetch-blender-pbr-assets.mjs first.')
    image = bpy.data.images.load(str(image_path), check_existing=True)
    if non_color:
        image.colorspace_settings.name = 'Non-Color'
    return image


def make_image_pbr_material(
    name,
    asset_id,
    *,
    scale=(1.0, 1.0, 1.0),
    saturation=1.0,
    value=1.0,
    roughness_range=(0.28, 0.78),
    normal_strength=0.55,
    tint=None,
    tint_factor=0.0,
):
    """Create a three-layer PBR material from bundled diffuse, roughness and GL normal maps."""
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = rgba(tint or '#B8A38A')
    material['pbr_asset_id'] = asset_id
    material['pbr_license'] = 'CC0 1.0'
    material['pbr_source'] = f'https://polyhaven.com/a/{asset_id}'
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    coordinates = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = scale
    links.new(coordinates.outputs['Object'], mapping.inputs['Vector'])

    diffuse = nodes.new('ShaderNodeTexImage')
    diffuse.image = load_texture_image(f'{asset_id}_diffuse_1k.jpg')
    diffuse.projection = 'BOX'
    diffuse.projection_blend = 0.18
    diffuse.extension = 'REPEAT'
    links.new(mapping.outputs['Vector'], diffuse.inputs['Vector'])
    colour_output = diffuse.outputs['Color']
    hsv = nodes.new('ShaderNodeHueSaturation')
    hsv.inputs['Saturation'].default_value = saturation
    hsv.inputs['Value'].default_value = value
    links.new(colour_output, hsv.inputs['Color'])
    colour_output = hsv.outputs['Color']
    if tint and tint_factor > 0:
        mix = nodes.new('ShaderNodeMixRGB')
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Fac'].default_value = tint_factor
        mix.inputs[2].default_value = rgba(tint)
        links.new(colour_output, mix.inputs[1])
        colour_output = mix.outputs['Color']
    links.new(colour_output, principled.inputs['Base Color'])

    roughness = nodes.new('ShaderNodeTexImage')
    roughness.image = load_texture_image(f'{asset_id}_rough_1k.jpg', non_color=True)
    roughness.projection = 'BOX'
    roughness.projection_blend = 0.18
    roughness.extension = 'REPEAT'
    links.new(mapping.outputs['Vector'], roughness.inputs['Vector'])
    roughness_range_node = nodes.new('ShaderNodeMapRange')
    roughness_range_node.inputs['To Min'].default_value = roughness_range[0]
    roughness_range_node.inputs['To Max'].default_value = roughness_range[1]
    links.new(roughness.outputs['Color'], roughness_range_node.inputs['Value'])
    links.new(roughness_range_node.outputs['Result'], principled.inputs['Roughness'])

    normal = nodes.new('ShaderNodeTexImage')
    normal.image = load_texture_image(f'{asset_id}_nor_gl_1k.jpg', non_color=True)
    normal.projection = 'BOX'
    normal.projection_blend = 0.18
    normal.extension = 'REPEAT'
    links.new(mapping.outputs['Vector'], normal.inputs['Vector'])
    normal_map = nodes.new('ShaderNodeNormalMap')
    normal_map.inputs['Strength'].default_value = normal_strength
    links.new(normal.outputs['Color'], normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
    links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    return material


def add_box(name: str, dimensions, location, material, *, bevel=0.025, collection=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new('Softened edges', 'BEVEL')
        modifier.width = min(bevel, min(dimensions) * 0.22)
        modifier.segments = 3
    if collection and obj.name not in collection.objects:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def add_soft_box(name: str, dimensions, location, material, *, bevel=0.10, collection=None):
    obj = add_box(name, dimensions, location, material, bevel=0, collection=collection)
    modifier = obj.modifiers.new('Soft upholstery edge', 'BEVEL')
    modifier.width = min(bevel, min(dimensions) * 0.46)
    modifier.segments = 6
    return obj


def import_model_instance(asset_id, name, location, collection, *, target_height=None, target_width=None, rotation=0):
    """Import a bundled CC0 glTF model and normalize it to a room-scale target."""
    entry_path = PBR_ROOT / 'models' / asset_id / f'{asset_id}_1k.gltf'
    if not entry_path.is_file():
        return None
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(entry_path))
    imported = sorted(set(bpy.data.objects) - before, key=lambda obj: obj.name)
    mesh_objects = [obj for obj in imported if obj.type == 'MESH']
    if not mesh_objects:
        raise RuntimeError(f'Imported model contains no mesh: {entry_path}')
    imported_set = set(imported)
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)
    for obj in imported:
        if obj.name not in collection.objects:
            for owner_collection in list(obj.users_collection):
                owner_collection.objects.unlink(obj)
            collection.objects.link(obj)
    for obj in imported:
        if obj.parent not in imported_set:
            world_matrix = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = world_matrix
    corners = [obj.matrix_world @ Vector(corner) for obj in mesh_objects for corner in obj.bound_box]
    minimum = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
    maximum = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
    dimensions = maximum - minimum
    if target_height:
        scale = target_height / max(dimensions.z, 0.001)
    elif target_width:
        scale = target_width / max(dimensions.x, dimensions.y, 0.001)
    else:
        scale = 1.0
    root.scale = (scale, scale, scale)
    root.rotation_euler[2] = rotation
    local_anchor = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2, minimum.z)) * scale
    rotated_anchor = Vector((
        local_anchor.x * math.cos(rotation) - local_anchor.y * math.sin(rotation),
        local_anchor.x * math.sin(rotation) + local_anchor.y * math.cos(rotation),
        local_anchor.z,
    ))
    root.location = Vector(location) - rotated_anchor
    root['asset_source'] = f'https://polyhaven.com/a/{asset_id}'
    root['asset_license'] = 'CC0 1.0'
    root['asset_role'] = 'bundled_realistic_furniture'
    return root


def add_cylinder(name: str, radius, depth, location, material, *, vertices=32, collection=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    bevel = obj.modifiers.new('Softened edges', 'BEVEL')
    bevel.width = 0.025
    bevel.segments = 3
    if collection and obj.name not in collection.objects:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def add_uv_sphere(name: str, dimensions, location, material, *, collection=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    bevel = obj.modifiers.new('Softened edges', 'BEVEL')
    bevel.width = min(dimensions) * 0.035
    bevel.segments = 2
    if collection and obj.name not in collection.objects:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def add_cylinder_between(name, start, end, radius, material, collection, *, vertices=20):
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    obj = add_cylinder(name, radius, direction.length, (start_vector + end_vector) / 2, material, vertices=vertices, collection=collection)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = direction.to_track_quat('Z', 'Y')
    return obj


def zone_centre(zone, bounds):
    box = zone['bounds']
    return (
        box['x'] + box['width'] / 2 - bounds['width'] / 2,
        bounds['depth'] / 2 - (box['z'] + box['depth'] / 2),
    )


def plan_point(x, z, bounds):
    return (x - bounds['width'] / 2, bounds['depth'] / 2 - z)


def contains(zone, x, z):
    box = zone['bounds']
    return box['x'] + EPSILON < x < box['x'] + box['width'] - EPSILON and box['z'] + EPSILON < z < box['z'] + box['depth'] - EPSILON


def room_at(zones, x, z):
    return next((zone for zone in zones if contains(zone, x, z)), None)


def material_for_zone(floor_id, zone, mats):
    classification = zone.get('classification', '')
    if 'exterior' in classification or 'balcony' in zone['id'] or 'porch' in zone['id']:
        return mats['terrace']
    if 'wet' in classification or 'wet' in zone['id'] or 'kitchen' in zone['id']:
        return mats['wet']
    return mats[{'floor-1': 'stone', 'floor-2': 'oak', 'floor-3': 'cement'}[floor_id]]


def is_exterior(zone):
    return zone and ('exterior' in zone.get('classification', '') or 'balcony' in zone['id'] or 'porch' in zone['id'])


def add_wall_piece(name, orientation, fixed, start, end, base_z, height, thickness, material, bounds, collection):
    length = end - start
    if length <= 0.04:
        return None
    middle = (start + end) / 2
    if orientation == 'vertical':
        x, y = plan_point(fixed, middle, bounds)
        dimensions = (thickness, length, height)
    else:
        x, y = plan_point(middle, fixed, bounds)
        dimensions = (length, thickness, height)
    return add_box(name, dimensions, (x, y, base_z + height / 2), material, bevel=0.018, collection=collection)


def add_frame(name, orientation, fixed, start, end, base_z, bounds, mats, collection, opening_height=2.35):
    left = start
    right = end
    centre = (left + right) / 2
    jamb = 0.055
    for index, position in enumerate((left, right)):
        if orientation == 'vertical':
            x, y = plan_point(fixed, position, bounds)
            dims = (0.08, jamb, opening_height)
        else:
            x, y = plan_point(position, fixed, bounds)
            dims = (jamb, 0.08, opening_height)
        add_box(f'{name}-jamb-{index}', dims, (x, y, base_z + opening_height / 2), mats['black'], bevel=0.008, collection=collection)
    if orientation == 'vertical':
        x, y = plan_point(fixed, centre, bounds)
        dims = (0.08, right - left, 0.07)
    else:
        x, y = plan_point(centre, fixed, bounds)
        dims = (right - left, 0.08, 0.07)
    add_box(f'{name}-head', dims, (x, y, base_z + opening_height), mats['black'], bevel=0.008, collection=collection)


def add_glazed_partition(name, orientation, fixed, start, end, base_z, bounds, mats, collection, leave_open=True):
    length = end - start
    open_width = min(1.8, length * 0.42) if leave_open else 0
    gap_start = (start + end - open_width) / 2
    gap_end = gap_start + open_width
    segments = ((start, gap_start), (gap_end, end)) if leave_open else ((start, end),)
    for index, (segment_start, segment_end) in enumerate(segments):
        panel_width = segment_end - segment_start
        if panel_width < 0.18:
            continue
        centre = (segment_start + segment_end) / 2
        if orientation == 'vertical':
            x, y = plan_point(fixed, centre, bounds)
            dims = (0.025, panel_width - 0.035, 2.25)
        else:
            x, y = plan_point(centre, fixed, bounds)
            dims = (panel_width - 0.035, 0.025, 2.25)
        add_box(f'{name}-glass-{index}', dims, (x, y, base_z + 1.125), mats['glass'], bevel=0.005, collection=collection)
        add_frame(f'{name}-panel-{index}', orientation, fixed, segment_start, segment_end, base_z, bounds, mats, collection, opening_height=2.28)
    add_frame(f'{name}-opening', orientation, fixed, gap_start, gap_end, base_z, bounds, mats, collection, opening_height=2.28)


def add_window_wall(name, orientation, fixed, start, end, base_z, bounds, mats, collection, owner):
    length = end - start
    wet = 'wet' in owner.get('classification', '') or 'wet' in owner['id']
    window_width = min(length - 0.7, 1.35 if wet else 2.25)
    if window_width < 0.7:
        add_wall_piece(name, orientation, fixed, start, end, base_z, WALL_HEIGHT, EXTERIOR_WALL_THICKNESS, mats['wall'], bounds, collection)
        return None
    window_start = (start + end - window_width) / 2
    window_end = window_start + window_width
    sill = 1.15 if wet else 0.78
    window_height = 1.0 if wet else 1.45
    add_wall_piece(f'{name}-left', orientation, fixed, start, window_start, base_z, WALL_HEIGHT, EXTERIOR_WALL_THICKNESS, mats['wall'], bounds, collection)
    add_wall_piece(f'{name}-right', orientation, fixed, window_end, end, base_z, WALL_HEIGHT, EXTERIOR_WALL_THICKNESS, mats['wall'], bounds, collection)
    add_wall_piece(f'{name}-sill', orientation, fixed, window_start, window_end, base_z, sill, EXTERIOR_WALL_THICKNESS, mats['wall'], bounds, collection)
    header_height = WALL_HEIGHT - (sill + window_height)
    add_wall_piece(f'{name}-head', orientation, fixed, window_start, window_end, base_z + sill + window_height, header_height, EXTERIOR_WALL_THICKNESS, mats['wall'], bounds, collection)
    centre = (window_start + window_end) / 2
    if orientation == 'vertical':
        x, y = plan_point(fixed, centre, bounds)
        dims = (0.025, window_width - 0.06, window_height - 0.06)
    else:
        x, y = plan_point(centre, fixed, bounds)
        dims = (window_width - 0.06, 0.025, window_height - 0.06)
    add_box(f'{name}-glass', dims, (x, y, base_z + sill + window_height / 2), mats['glass'], bevel=0.004, collection=collection)
    add_frame(f'{name}-frame', orientation, fixed, window_start, window_end, base_z + sill, bounds, mats, collection, opening_height=window_height)
    add_window_treatment(f'{name}-curtain', orientation, fixed, window_start, window_end, base_z, bounds, owner, mats['curtain'], collection)
    return window_start, window_end


def add_window_treatment(name, orientation, fixed, start, end, base_z, bounds, owner, material, collection):
    """Add floor-to-ceiling fabric folds on both sides of an exterior window."""
    room_x, room_y = zone_centre(owner, bounds)
    centre = (start + end) / 2
    boundary_x, boundary_y = plan_point(fixed, centre, bounds) if orientation == 'vertical' else plan_point(centre, fixed, bounds)
    inward = (Vector((room_x, room_y, 0)) - Vector((boundary_x, boundary_y, 0))).normalized()
    curtain_height = 2.52
    for side, anchor in ((-1, start + 0.16), (1, end - 0.16)):
        for fold in range(4):
            along = anchor + side * (fold - 1.5) * 0.105
            if orientation == 'vertical':
                px, py = plan_point(fixed, along, bounds)
                dims = (0.075 + (fold % 2) * 0.018, 0.14, curtain_height)
            else:
                px, py = plan_point(along, fixed, bounds)
                dims = (0.14, 0.075 + (fold % 2) * 0.018, curtain_height)
            location = Vector((px, py, base_z + 1.36)) + inward * (0.12 + (fold % 2) * 0.025)
            add_soft_box(f'{name}-{side}-{fold}', dims, location, material, bevel=0.035, collection=collection)


def add_daylight_portal(name, orientation, fixed, start, end, base_z, bounds, owner, collection, energy):
    """Push broad, directional daylight through a window or glazed opening."""
    centre = (start + end) / 2
    if orientation == 'vertical':
        x, y = plan_point(fixed, centre, bounds)
        portal_width = max(0.65, end - start - 0.12)
    else:
        x, y = plan_point(centre, fixed, bounds)
        portal_width = max(0.65, end - start - 0.12)
    room_x, room_y = zone_centre(owner, bounds)
    boundary = Vector((x, y, base_z + 1.48))
    target = Vector((room_x, room_y, base_z + 1.02))
    direction = (target - boundary).normalized()
    location = boundary + direction * 0.16
    light = add_area_light(
        name,
        location,
        energy,
        '#FFF2D7',
        portal_width,
        collection,
        use_shadow=False,
        shape='RECTANGLE',
        size_y=1.55,
    )
    light.rotation_mode = 'QUATERNION'
    light.rotation_quaternion = (target - light.location).to_track_quat('-Z', 'Y')
    light.data.spread = math.radians(112)
    light['lighting_role'] = 'window_daylight_portal'
    return light


def add_railing(name, orientation, fixed, start, end, base_z, bounds, mats, collection):
    length = end - start
    centre = (start + end) / 2
    if orientation == 'vertical':
        x, y = plan_point(fixed, centre, bounds)
        glass_dims = (0.03, length, 0.78)
        rail_dims = (0.07, length, 0.08)
    else:
        x, y = plan_point(centre, fixed, bounds)
        glass_dims = (length, 0.03, 0.78)
        rail_dims = (length, 0.07, 0.08)
    add_box(f'{name}-glass', glass_dims, (x, y, base_z + 0.53), mats['glass'], bevel=0.004, collection=collection)
    add_box(f'{name}-cap', rail_dims, (x, y, base_z + 0.96), mats['black'], bevel=0.012, collection=collection)


def opening_width(a, b, length):
    names = f'{a}|{b}'
    if 'balcony' in names or 'porch' in names or 'landscape' in names:
        return min(length - 0.5, 2.5)
    if 'stair' in names:
        return min(length - 0.5, 1.8)
    if 'hall' in names and 'dining' in names:
        return min(length - 0.5, 2.1)
    return min(length - 0.5, 1.25)


def build_boundaries(floor, zones, base_z, mats, collection):
    bounds = floor['overall_bounds']
    xs = sorted({round(value, 4) for zone in zones for value in (zone['bounds']['x'], zone['bounds']['x'] + zone['bounds']['width'])})
    zs = sorted({round(value, 4) for zone in zones for value in (zone['bounds']['z'], zone['bounds']['z'] + zone['bounds']['depth'])})
    opening_pairs = {tuple(sorted(item['between'])): item for item in floor.get('openings', [])}
    for route in floor.get('circulation', []):
        if route.get('class') != 'drawing_fact':
            continue
        sequence = [route['from'], *route.get('via', []), route['to']]
        for start_id, end_id in zip(sequence, sequence[1:]):
            opening_pairs.setdefault(
                tuple(sorted((start_id, end_id))),
                {'between': [start_id, end_id], 'basis': 'drawing-fact circulation'},
            )
    segment_index = 0

    def process(orientation, fixed, start, end, side_a, side_b):
        nonlocal segment_index
        if not side_a and not side_b:
            return
        if side_a and side_b and side_a['id'] == side_b['id']:
            return
        segment_index += 1
        name = f"{floor['floor_id']}-wall-{segment_index:03d}"
        owners = [owner for owner in (side_a, side_b) if owner]
        pair = tuple(sorted(owner['id'] for owner in owners)) if len(owners) == 2 else None
        length = end - start
        if len(owners) == 1 and is_exterior(owners[0]):
            add_railing(name, orientation, fixed, start, end, base_z, bounds, mats, collection)
            return
        if len(owners) == 1:
            aperture = add_window_wall(name, orientation, fixed, start, end, base_z, bounds, mats, collection, owners[0])
            if aperture:
                portal_energy = 42 if floor['floor_id'] == 'floor-1' else 185
                add_daylight_portal(f'{name}-daylight', orientation, fixed, aperture[0], aperture[1], base_z, bounds, owners[0], collection, portal_energy)
            return
        if pair == tuple(sorted(('f1-living', 'f1-dining'))):
            return
        if pair == tuple(sorted(('f1-dining', 'f1-kitchen'))):
            add_glazed_partition(name, orientation, fixed, start, end, base_z, bounds, mats, collection, leave_open=True)
            return
        if pair in opening_pairs:
            if any('stair' in owner['id'] for owner in owners):
                width = opening_width(pair[0], pair[1], length)
            elif any(is_exterior(owner) for owner in owners):
                add_glazed_partition(name, orientation, fixed, start, end, base_z, bounds, mats, collection, leave_open=True)
                interior_owner = next(owner for owner in owners if not is_exterior(owner))
                portal_energy = 55 if floor['floor_id'] == 'floor-1' else 215
                add_daylight_portal(f'{name}-daylight', orientation, fixed, start, end, base_z, bounds, interior_owner, collection, portal_energy)
                return
            else:
                width = opening_width(pair[0], pair[1], length)
            if pair == tuple(sorted(('f1-hall', 'f1-stair'))) and orientation == 'horizontal':
                # Keep the stair door to the right of the shrine wall so the
                # drawing-fact circulation axis remains physically passable.
                gap_start = end - width
                gap_end = end
            else:
                gap_start = (start + end - width) / 2
                gap_end = gap_start + width
            add_wall_piece(f'{name}-a', orientation, fixed, start, gap_start, base_z, WALL_HEIGHT, WALL_THICKNESS, mats['wall'], bounds, collection)
            add_wall_piece(f'{name}-b', orientation, fixed, gap_end, end, base_z, WALL_HEIGHT, WALL_THICKNESS, mats['wall'], bounds, collection)
            add_frame(f'{name}-frame', orientation, fixed, gap_start, gap_end, base_z, bounds, mats, collection)
            return
        if all(is_exterior(owner) for owner in owners):
            return
        public_owner = next((owner for owner in owners if any(token in owner['id'] for token in ('hall', 'lounge'))), None)
        other_owner = next((owner for owner in owners if owner is not public_owner), None)
        if public_owner and other_owner and length > 1.15 and not any(token in other_owner['id'] for token in ('kitchen', 'stair')):
            width = 1.05
            gap_start = (start + end - width) / 2
            gap_end = gap_start + width
            add_wall_piece(f'{name}-a', orientation, fixed, start, gap_start, base_z, WALL_HEIGHT, WALL_THICKNESS, mats['wall'], bounds, collection)
            add_wall_piece(f'{name}-b', orientation, fixed, gap_end, end, base_z, WALL_HEIGHT, WALL_THICKNESS, mats['wall'], bounds, collection)
            add_frame(f'{name}-inferred-door', orientation, fixed, gap_start, gap_end, base_z, bounds, mats, collection)
            return
        add_wall_piece(name, orientation, fixed, start, end, base_z, WALL_HEIGHT, WALL_THICKNESS, mats['wall'], bounds, collection)

    for x in xs:
        for start, end in zip(zs, zs[1:]):
            middle = (start + end) / 2
            process('vertical', x, start, end, room_at(zones, x - EPSILON * 2, middle), room_at(zones, x + EPSILON * 2, middle))
    for z in zs:
        for start, end in zip(xs, xs[1:]):
            middle = (start + end) / 2
            process('horizontal', z, start, end, room_at(zones, middle, z - EPSILON * 2), room_at(zones, middle, z + EPSILON * 2))


def add_rug(name, size, location, material, collection):
    return add_box(name, (size[0], size[1], 0.025), (location[0], location[1], location[2] + 0.018), material, bevel=0.06, collection=collection)


def oriented_point(centre, offset, base_z, rotation):
    cosine = math.cos(rotation)
    sine = math.sin(rotation)
    dx, dy, dz = offset
    return (
        centre[0] + dx * cosine - dy * sine,
        centre[1] + dx * sine + dy * cosine,
        base_z + dz,
    )


def add_oriented_box(name, dimensions, centre, offset, base_z, rotation, material, bevel, collection):
    """Place a furniture part in world space around a shared local centre.

    Direct world-space placement avoids Blender-version-specific parent inverse
    evaluation during headless scene generation.
    """
    location = oriented_point(centre, offset, base_z, rotation)
    part = add_box(name, dimensions, location, material, bevel=bevel, collection=collection)
    part.rotation_euler[2] = rotation
    return part


def add_oriented_soft_box(name, dimensions, centre, offset, base_z, rotation, material, bevel, collection):
    location = oriented_point(centre, offset, base_z, rotation)
    part = add_soft_box(name, dimensions, location, material, bevel=bevel, collection=collection)
    part.rotation_euler[2] = rotation
    return part


def add_sofa(name, centre, base_z, mats, collection, width=2.7, rotation=0):
    group = bpy.data.objects.new(name, None)
    collection.objects.link(group)
    group.location = centre[0], centre[1], base_z
    group['furniture_type'] = 'sofa'
    add_oriented_box(f'{name}-base', (width - 0.10, 0.72, 0.16), centre, (0, 0, 0.18), base_z, rotation, mats['wood_dark'], 0.04, collection)
    cushion_count = max(2, round(width / 0.82))
    cushion_width = (width - 0.30) / cushion_count
    for index in range(cushion_count):
        x = -width / 2 + 0.15 + cushion_width * (index + 0.5)
        add_oriented_soft_box(f'{name}-seat-cushion-{index}', (cushion_width - 0.025, 0.73, 0.22), centre, (x, -0.02, 0.41), base_z, rotation, mats['fabric'], 0.095, collection)
        add_oriented_soft_box(f'{name}-back-cushion-{index}', (cushion_width - 0.035, 0.18, 0.53), centre, (x, 0.31, 0.73), base_z, rotation, mats['fabric_light'], 0.078, collection)
    for side in (-1, 1):
        add_oriented_box(f'{name}-arm-{side}', (0.17, 0.82, 0.48), centre, (side * (width / 2 - 0.08), 0, 0.48), base_z, rotation, mats['fabric'], 0.08, collection)
        for y in (-0.24, 0.24):
            add_oriented_box(f'{name}-leg-{side}-{y}', (0.065, 0.065, 0.16), centre, (side * (width / 2 - 0.18), y, 0.08), base_z, rotation, mats['black'], 0.015, collection)
    return group


def add_bed(name, centre, base_z, mats, collection, width=1.8, length=2.0, rotation=0):
    group = bpy.data.objects.new(name, None)
    collection.objects.link(group)
    group.location = centre[0], centre[1], base_z
    group['furniture_type'] = 'bed'
    add_oriented_box(f'{name}-base', (width + 0.1, length + 0.1, 0.20), centre, (0, 0, 0.18), base_z, rotation, mats['wood_dark'], 0.06, collection)
    add_oriented_soft_box(f'{name}-mattress', (width, length, 0.24), centre, (0, 0, 0.38), base_z, rotation, mats['linen'], 0.105, collection)
    add_oriented_box(f'{name}-headboard', (width + 0.15, 0.12, 0.78), centre, (0, length / 2, 0.62), base_z, rotation, mats['wood'], 0.04, collection)
    add_oriented_soft_box(f'{name}-pillow-a', (width * 0.42, 0.46, 0.13), centre, (-width * 0.23, length * 0.26, 0.58), base_z, rotation, mats['linen_light'], 0.058, collection)
    add_oriented_soft_box(f'{name}-pillow-b', (width * 0.42, 0.46, 0.13), centre, (width * 0.23, length * 0.26, 0.58), base_z, rotation, mats['linen_light'], 0.058, collection)
    add_oriented_soft_box(f'{name}-duvet', (width * 0.94, length * 0.68, 0.12), centre, (0, -length * 0.10, 0.58), base_z, rotation, mats['linen_accent'], 0.052, collection)
    for side in (-1, 1):
        x = side * (width / 2 + 0.26)
        add_oriented_box(f'{name}-nightstand-{side}', (0.42, 0.38, 0.38), centre, (x, length * 0.28, 0.22), base_z, rotation, mats['wood_dark'], 0.045, collection)
        lamp_point = oriented_point(centre, (x, length * 0.28, 0.56), base_z, rotation)
        add_cylinder(f'{name}-lamp-base-{side}', 0.08, 0.26, lamp_point, mats['black'], vertices=24, collection=collection)
        shade_point = oriented_point(centre, (x, length * 0.28, 0.76), base_z, rotation)
        add_uv_sphere(f'{name}-lamp-shade-{side}', (0.25, 0.25, 0.20), shade_point, mats['light'], collection=collection)
    return group


def add_table_and_chairs(name, centre, base_z, mats, collection):
    add_box(f'{name}-top', (2.3, 0.95, 0.09), (centre[0], centre[1], base_z + 0.76), mats['wood'], bevel=0.06, collection=collection)
    for dx in (-0.92, 0.92):
        add_box(f'{name}-leg-{dx}', (0.11, 0.72, 0.72), (centre[0] + dx, centre[1], base_z + 0.38), mats['wood_dark'], bevel=0.025, collection=collection)
    chair_positions = [(-0.75, -0.72), (0, -0.72), (0.75, -0.72), (-0.75, 0.72), (0, 0.72), (0.75, 0.72), (-1.38, 0), (1.38, 0)]
    for index, (dx, dy) in enumerate(chair_positions):
        if abs(dx) > 1.0:
            chair_rotation = math.radians(-90 if dx < 0 else 90)
        else:
            chair_rotation = 0 if dy < 0 else math.pi
        chair = import_model_instance(
            'dining_chair_02',
            f'{name}-chair-{index}',
            (centre[0] + dx, centre[1] + dy, base_z),
            collection,
            target_height=0.92,
            rotation=chair_rotation,
        )
        if chair is None:
            add_soft_box(f'{name}-chair-{index}-seat', (0.42, 0.42, 0.08), (centre[0] + dx, centre[1] + dy, base_z + 0.47), mats['leather'], bevel=0.045, collection=collection)
            add_soft_box(f'{name}-chair-{index}-back', (0.42, 0.08, 0.56), (centre[0] + dx, centre[1] + dy + (0.18 if dy > 0 else -0.18), base_z + 0.69), mats['leather'], bevel=0.055, collection=collection)
            for leg_x in (-0.15, 0.15):
                for leg_y in (-0.15, 0.15):
                    add_box(f'{name}-chair-{index}-leg-{leg_x}-{leg_y}', (0.035, 0.035, 0.44), (centre[0] + dx + leg_x, centre[1] + dy + leg_y, base_z + 0.23), mats['black'], bevel=0.009, collection=collection)
    for index, x in enumerate((-0.58, 0.58)):
        add_cylinder(f'{name}-pendant-cord-{index}', 0.012, 0.72, (centre[0] + x, centre[1], base_z + 2.42), mats['black'], vertices=16, collection=collection)
        shade = add_cylinder(f'{name}-pendant-shade-{index}', 0.22, 0.16, (centre[0] + x, centre[1], base_z + 2.03), mats['brass'], vertices=32, collection=collection)
        shade.scale.z = 0.55
        add_uv_sphere(f'{name}-pendant-light-{index}', (0.15, 0.15, 0.11), (centre[0] + x, centre[1], base_z + 1.94), mats['light'], collection=collection)


def add_plant(name, location, base_z, mats, collection, scale=1.0):
    add_cylinder(f'{name}-pot', 0.23 * scale, 0.42 * scale, (location[0], location[1], base_z + 0.21 * scale), mats['terracotta'], vertices=32, collection=collection)
    for index, angle in enumerate((0, 1.3, 2.5, 3.8, 5.0)):
        leaf = add_uv_sphere(f'{name}-leaf-{index}', (0.18 * scale, 0.52 * scale, 0.07 * scale), (location[0], location[1], base_z + (0.55 + index * 0.06) * scale), mats['green'], collection=collection)
        leaf.rotation_euler = (0.55 + index * 0.05, angle, angle)


def add_floor2_open_kitchen(zone, base_z, bounds, mats, collection):
    """Add the QA-requested open light kitchen without inventing a new room."""
    cx, cy = zone_centre(zone, bounds)
    depth = zone['bounds']['depth']
    island_y = cy - depth * 0.24
    island = add_box('f2-open-kitchen-island', (2.45, 0.92, 0.90), (cx, island_y, base_z + 0.45), mats['cabinet_light'], bevel=0.055, collection=collection)
    island['floor_id'] = 'floor-2'
    island['zone_id'] = 'f2-lounge'
    island['design_role'] = 'open electric light-kitchen proposal inside the family lounge'
    island['qa_source'] = 'example/input/DESIGN.md'
    island['site_verification'] = 'confirm flue, water, drainage, power and local gas/open-kitchen rules'
    add_box('f2-open-kitchen-worktop', (2.56, 1.02, 0.055), (cx, island_y, base_z + 0.93), mats['stone_dark'], bevel=0.025, collection=collection)
    for index in range(3):
        panel_x = cx - 0.78 + index * 0.78
        add_box(f'f2-open-kitchen-front-{index}', (0.74, 0.035, 0.68), (panel_x, island_y + 0.475, base_z + 0.48), mats['cabinet'], bevel=0.016, collection=collection)
    add_box('f2-open-kitchen-induction', (0.62, 0.46, 0.025), (cx + 0.62, island_y, base_z + 0.97), mats['black'], bevel=0.025, collection=collection)
    add_box('f2-open-kitchen-sink', (0.64, 0.42, 0.045), (cx - 0.60, island_y, base_z + 0.98), mats['metal'], bevel=0.07, collection=collection)
    add_cylinder_between('f2-open-kitchen-faucet', (cx - 0.60, island_y - 0.15, base_z + 1.00), (cx - 0.60, island_y - 0.15, base_z + 1.31), 0.023, mats['brass'], collection)
    add_box('f2-open-kitchen-undercounter-appliance', (0.62, 0.035, 0.68), (cx + 0.74, island_y - 0.475, base_z + 0.48), mats['metal'], bevel=0.025, collection=collection)
    for index, x in enumerate((cx - 0.62, cx + 0.62)):
        add_cylinder(f'f2-open-kitchen-pendant-{index}-cord', 0.012, 0.72, (x, island_y, base_z + 2.42), mats['black'], vertices=16, collection=collection)
        add_uv_sphere(f'f2-open-kitchen-pendant-{index}-shade', (0.28, 0.28, 0.22), (x, island_y, base_z + 2.02), mats['light'], collection=collection)


def furnish_zone(floor_id, zone, base_z, bounds, mats, collection):
    cx, cy = zone_centre(zone, bounds)
    width = zone['bounds']['width']
    depth = zone['bounds']['depth']
    zone_id = zone['id']
    if 'stair' in zone_id:
        return
    if 'dining' in zone_id:
        add_rug(f'{zone_id}-rug', (3.2, 2.0), (cx, cy, base_z), mats['rug'], collection)
        add_table_and_chairs(f'{zone_id}-table', (cx, cy), base_z, mats, collection)
    elif 'kitchen' in zone_id:
        counter_y = cy - depth / 2 + 0.36
        add_box(f'{zone_id}-counter-n', (width - 0.55, 0.62, 0.92), (cx, counter_y, base_z + 0.46), mats['cabinet'], bevel=0.045, collection=collection)
        add_box(f'{zone_id}-counter-w', (0.62, depth - 0.75, 0.92), (cx - width / 2 + 0.36, cy + 0.18, base_z + 0.46), mats['cabinet'], bevel=0.045, collection=collection)
        add_box(f'{zone_id}-stone-n', (width - 0.48, 0.67, 0.05), (cx, counter_y, base_z + 0.95), mats['stone_dark'], bevel=0.02, collection=collection)
        add_box(f'{zone_id}-backsplash', (width - 0.62, 0.035, 0.62), (cx, cy - depth / 2 + 0.035, base_z + 1.25), mats['wet_light'], bevel=0.008, collection=collection)
        unit_width = (width - 0.72) / 4
        for index in range(4):
            x = cx - (width - 0.72) / 2 + unit_width * (index + 0.5)
            add_box(f'{zone_id}-base-front-{index}', (unit_width - 0.025, 0.025, 0.70), (x, counter_y + 0.315, base_z + 0.47), mats['cabinet_light'], bevel=0.012, collection=collection)
            add_box(f'{zone_id}-base-handle-{index}', (0.18, 0.025, 0.018), (x, counter_y + 0.335, base_z + 0.75), mats['brass'], bevel=0.008, collection=collection)
        for index, x in enumerate((cx - 0.55, cx + 0.42)):
            add_box(f'{zone_id}-upper-{index}', (0.82, 0.34, 0.66), (x, cy - depth / 2 + 0.19, base_z + 1.82), mats['cabinet_light'], bevel=0.025, collection=collection)
            add_box(f'{zone_id}-upper-handle-{index}', (0.20, 0.025, 0.018), (x, cy - depth / 2 + 0.38, base_z + 1.62), mats['brass'], bevel=0.008, collection=collection)
        add_box(f'{zone_id}-under-cabinet-light', (min(width - 0.82, 2.15), 0.035, 0.025), (cx - 0.08, cy - depth / 2 + 0.39, base_z + 1.47), mats['light'], bevel=0.008, collection=collection)
        add_area_light(f'{zone_id}-counter-wash', (cx - 0.08, cy - depth / 2 + 0.46, base_z + 1.43), 72 if floor_id == 'floor-1' else 55, '#FFC98E', min(width - 0.9, 2.0), collection, shape='RECTANGLE', size_y=0.28)
        sink_x = cx - min(0.55, width * 0.18)
        add_box(f'{zone_id}-sink', (0.72, 0.42, 0.045), (sink_x, counter_y, base_z + 0.985), mats['black'], bevel=0.07, collection=collection)
        add_cylinder_between(f'{zone_id}-faucet-stem', (sink_x, counter_y - 0.15, base_z + 1.01), (sink_x, counter_y - 0.15, base_z + 1.34), 0.025, mats['brass'], collection)
        add_cylinder_between(f'{zone_id}-faucet-spout', (sink_x, counter_y - 0.15, base_z + 1.32), (sink_x, counter_y + 0.02, base_z + 1.23), 0.022, mats['brass'], collection)
        add_box(f'{zone_id}-cooktop', (0.66, 0.44, 0.025), (cx + min(0.72, width * 0.20), counter_y, base_z + 0.99), mats['black'], bevel=0.025, collection=collection)
        fridge_x = cx + width / 2 - 0.56
        add_box(f'{zone_id}-fridge', (0.82, 0.72, 2.05), (fridge_x, cy - depth / 2 + 0.42, base_z + 1.025), mats['metal'], bevel=0.05, collection=collection)
        add_box(f'{zone_id}-fridge-handle', (0.025, 0.035, 0.70), (fridge_x - 0.28, cy - depth / 2 + 0.79, base_z + 1.16), mats['black'], bevel=0.01, collection=collection)
    elif 'wet' in zone_id:
        vanity_x = cx - width * 0.22
        vanity_y = cy - depth * 0.22
        add_box(f'{zone_id}-vanity', (1.25, 0.52, 0.82), (vanity_x, vanity_y, base_z + 0.41), mats['wood'], bevel=0.05, collection=collection)
        add_box(f'{zone_id}-vanity-front-a', (0.59, 0.025, 0.56), (vanity_x - 0.31, vanity_y + 0.27, base_z + 0.43), mats['wood_light'], bevel=0.016, collection=collection)
        add_box(f'{zone_id}-vanity-front-b', (0.59, 0.025, 0.56), (vanity_x + 0.31, vanity_y + 0.27, base_z + 0.43), mats['wood_light'], bevel=0.016, collection=collection)
        add_box(f'{zone_id}-basin', (0.58, 0.36, 0.10), (vanity_x, vanity_y, base_z + 0.86), mats['porcelain'], bevel=0.08, collection=collection)
        add_cylinder_between(f'{zone_id}-tap', (vanity_x, vanity_y - 0.12, base_z + 0.88), (vanity_x, vanity_y - 0.12, base_z + 1.11), 0.022, mats['brass'], collection)
        add_box(f'{zone_id}-mirror', (1.05, 0.045, 0.78), (vanity_x, vanity_y - 0.28, base_z + 1.45), mats['mirror'], bevel=0.04, collection=collection)
        toilet_x = cx + width * 0.22
        toilet_y = cy - depth * 0.15
        add_box(f'{zone_id}-toilet-tank', (0.48, 0.24, 0.64), (toilet_x, toilet_y - 0.18, base_z + 0.43), mats['porcelain'], bevel=0.08, collection=collection)
        bowl = add_uv_sphere(f'{zone_id}-toilet-bowl', (0.54, 0.68, 0.34), (toilet_x, toilet_y + 0.10, base_z + 0.28), mats['porcelain'], collection=collection)
        bowl.scale.y = 1.05
        if floor_id != 'floor-1':
            screen_y = cy + depth * 0.2
            screen_depth = min(1.3, depth * 0.4)
            add_box(f'{zone_id}-shower-tray', (min(1.0, width * 0.25), screen_depth, 0.055), (cx + width * 0.34, screen_y, base_z + 0.035), mats['wet_light'], bevel=0.03, collection=collection)
            add_box(f'{zone_id}-screen', (0.035, screen_depth, 1.95), (cx + width * 0.34, screen_y, base_z + 0.98), mats['glass'], bevel=0.004, collection=collection)
            for y in (screen_y - screen_depth / 2, screen_y + screen_depth / 2):
                add_box(f'{zone_id}-screen-frame-{y}', (0.045, 0.045, 1.98), (cx + width * 0.34, y, base_z + 0.99), mats['black'], bevel=0.008, collection=collection)
            add_cylinder_between(f'{zone_id}-shower-riser', (cx + width * 0.40, cy + depth * 0.38, base_z + 0.72), (cx + width * 0.40, cy + depth * 0.38, base_z + 2.05), 0.022, mats['brass'], collection)
            add_cylinder(f'{zone_id}-shower-head', 0.12, 0.035, (cx + width * 0.40, cy + depth * 0.30, base_z + 2.04), mats['brass'], vertices=32, collection=collection)
    elif 'porch' in zone_id or 'balcony' in zone_id or 'landscape' in zone_id:
        if 'life' in zone_id:
            add_box(f'{zone_id}-washer', (0.68, 0.68, 0.88), (cx - width * 0.28, cy, base_z + 0.44), mats['porcelain'], bevel=0.08, collection=collection)
            add_box(f'{zone_id}-utility', (1.0, 0.45, 1.8), (cx + width * 0.25, cy, base_z + 0.9), mats['cabinet'], bevel=0.04, collection=collection)
        else:
            add_box(f'{zone_id}-bench', (1.8, 0.62, 0.34), (cx, cy, base_z + 0.23), mats['wood'], bevel=0.09, collection=collection)
            add_box(f'{zone_id}-bench-cushion', (1.66, 0.54, 0.12), (cx, cy, base_z + 0.46), mats['fabric_light'], bevel=0.08, collection=collection)
            add_cylinder(f'{zone_id}-side-table', 0.32, 0.48, (cx + width * 0.22, cy + 0.16, base_z + 0.24), mats['stone_dark'], vertices=40, collection=collection)
            add_plant(f'{zone_id}-plant-a', (cx - width * 0.3, cy + depth * 0.22), base_z, mats, collection, 1.1)
            add_plant(f'{zone_id}-plant-b', (cx + width * 0.3, cy - depth * 0.22), base_z, mats, collection, 0.85)
    elif any(token in zone_id for token in ('primary', 'guest', 'bedroom', 'west-south', 'west-north')):
        bed_width = 1.8 if 'primary' in zone_id else 1.5
        add_rug(f'{zone_id}-rug', (bed_width + 0.9, 2.75), (cx, cy, base_z), mats['rug'], collection)
        # Put the headboard on the exterior side so the hall-side doorway
        # receives a legible bed-end view instead of a cropped side view.
        bed_rotation = math.radians(90 if cx < 0 else -90)
        add_bed(f'{zone_id}-bed', (cx, cy - 0.15), base_z, mats, collection, width=bed_width, rotation=bed_rotation)
        if width > 3.0 and depth > 3.0:
            import_model_instance('modern_arm_chair_01', f'{zone_id}-reading-chair', (cx - width * 0.30, cy + depth * 0.25, base_z), collection, target_height=0.90, rotation=math.radians(28))
        wardrobe_width = min(2.5, width * 0.55)
        wardrobe_y = cy + depth / 2 - 0.34
        wardrobe_x = cx + width * 0.18
        add_box(f'{zone_id}-wardrobe', (wardrobe_width, 0.56, 2.35), (wardrobe_x, wardrobe_y, base_z + 1.175), mats['cabinet'], bevel=0.035, collection=collection)
        panel_width = wardrobe_width / 3
        for index in range(3):
            panel_x = wardrobe_x - wardrobe_width / 2 + panel_width * (index + 0.5)
            add_box(f'{zone_id}-wardrobe-panel-{index}', (panel_width - 0.025, 0.025, 2.20), (panel_x, wardrobe_y - 0.295, base_z + 1.17), mats['cabinet_light'], bevel=0.012, collection=collection)
            add_box(f'{zone_id}-wardrobe-handle-{index}', (0.018, 0.028, 0.48), (panel_x + panel_width * 0.28, wardrobe_y - 0.315, base_z + 1.18), mats['brass'], bevel=0.006, collection=collection)
    elif 'study' in zone_id:
        add_box(f'{zone_id}-desk', (1.8, 0.8, 0.07), (cx - 0.55, cy, base_z + 0.76), mats['wood'], bevel=0.035, collection=collection)
        for dx in (-0.66, 0.66):
            add_box(f'{zone_id}-desk-leg-{dx}', (0.08, 0.62, 0.7), (cx - 0.55 + dx, cy, base_z + 0.37), mats['black'], bevel=0.02, collection=collection)
        add_box(f'{zone_id}-shelf', (0.45, min(2.7, depth * 0.58), 2.3), (cx + width / 2 - 0.34, cy, base_z + 1.15), mats['wood_dark'], bevel=0.025, collection=collection)
        add_box(f'{zone_id}-monitor', (0.72, 0.06, 0.46), (cx - 0.55, cy - 0.10, base_z + 1.08), mats['black'], bevel=0.035, collection=collection)
        add_box(f'{zone_id}-monitor-stand', (0.08, 0.16, 0.25), (cx - 0.55, cy - 0.10, base_z + 0.83), mats['black'], bevel=0.015, collection=collection)
        add_box(f'{zone_id}-chair-seat', (0.52, 0.52, 0.10), (cx - 0.55, cy + 0.62, base_z + 0.48), mats['leather'], bevel=0.08, collection=collection)
        add_box(f'{zone_id}-chair-back', (0.52, 0.10, 0.66), (cx - 0.55, cy + 0.82, base_z + 0.76), mats['leather'], bevel=0.08, collection=collection)
        for index in range(5):
            add_box(f'{zone_id}-book-{index}', (0.10, 0.30, 0.42 + index * 0.025), (cx + width / 2 - 0.36, cy - 0.72 + index * 0.24, base_z + 0.82), mats['book_accent' if index % 2 else 'linen_accent'], bevel=0.012, collection=collection)
        add_sofa(f'{zone_id}-daybed', (cx - 0.2, cy + depth * 0.28), base_z, mats, collection, width=1.8)
    elif 'living' in zone_id or 'lounge' in zone_id or 'hall' in zone_id:
        lounge_y = cy + depth * 0.19 if floor_id == 'floor-2' and 'lounge' in zone_id else cy
        add_rug(f'{zone_id}-rug', (min(3.5, width * 0.72), min(2.8, depth * 0.38)), (cx, lounge_y, base_z), mats['rug'], collection)
        if floor_id == 'floor-1' and 'hall' in zone_id:
            add_sofa(f'{zone_id}-sofa', (cx - width * 0.34, cy + 0.45), base_z, mats, collection, width=2.45, rotation=math.radians(90))
            if import_model_instance('modern_coffee_table_01', f'{zone_id}-coffee', (cx - width * 0.17, cy + 0.45, base_z), collection, target_width=1.08, rotation=math.radians(90)) is None:
                add_box(f'{zone_id}-coffee', (0.72, 1.15, 0.30), (cx - width * 0.17, cy + 0.45, base_z + 0.17), mats['stone_dark'], bevel=0.12, collection=collection)
            add_box(f'{zone_id}-shrine-console', (1.8, 0.42, 0.9), (cx, cy - depth / 2 + 0.36, base_z + 0.45), mats['wood_dark'], bevel=0.045, collection=collection)
            add_box(f'{zone_id}-shrine-panel', (2.1, 0.10, 1.45), (cx, cy - depth / 2 + 0.20, base_z + 1.55), mats['wood'], bevel=0.04, collection=collection)
        else:
            add_sofa(f'{zone_id}-sofa', (cx - width * 0.12, lounge_y), base_z, mats, collection, width=min(3.1, width * 0.62))
            if import_model_instance('modern_coffee_table_01', f'{zone_id}-coffee', (cx + width * 0.18, lounge_y - 0.45, base_z), collection, target_width=1.15) is None:
                add_box(f'{zone_id}-coffee', (1.2, 0.7, 0.30), (cx + width * 0.18, lounge_y - 0.45, base_z + 0.17), mats['stone_dark'], bevel=0.12, collection=collection)
            import_model_instance('modern_arm_chair_01', f'{zone_id}-accent-chair', (cx + width * 0.28, lounge_y + min(1.15, depth * 0.14), base_z), collection, target_height=0.95, rotation=math.radians(-25))
            add_box(f'{zone_id}-media', (2.2, 0.38, 0.45), (cx + width / 2 - 0.35, lounge_y, base_z + 0.25), mats['wood_dark'], bevel=0.045, collection=collection)
            add_box(f'{zone_id}-television', (0.055, 1.45, 0.82), (cx + width / 2 - 0.16, lounge_y, base_z + 1.20), mats['black'], bevel=0.035, collection=collection)
            add_cylinder(f'{zone_id}-floor-lamp-pole', 0.025, 1.42, (cx - width * 0.34, lounge_y - depth * 0.12, base_z + 0.71), mats['brass'], vertices=20, collection=collection)
            add_uv_sphere(f'{zone_id}-floor-lamp-shade', (0.36, 0.36, 0.28), (cx - width * 0.34, lounge_y - depth * 0.12, base_z + 1.48), mats['light'], collection=collection)
            add_plant(f'{zone_id}-indoor-plant', (cx + width * 0.30, lounge_y + depth * 0.10), base_z, mats, collection, 0.78)
            if floor_id == 'floor-2' and 'lounge' in zone_id:
                add_floor2_open_kitchen(zone, base_z, bounds, mats, collection)


def add_staircase(floor, base_z, mats, collection):
    stair = next((zone for zone in floor['zones'] if 'stair' in zone['id']), None)
    if not stair:
        return
    bounds = floor['overall_bounds']
    box = stair['bounds']
    cx, cy = zone_centre(stair, bounds)
    floor_id = floor['floor_id']
    landing_depth = 1.12
    side_margin = 0.18
    flight_width = 1.25 if floor_id == 'floor-1' else 1.35
    well_gap = 0.28
    total_width = flight_width * 2 + well_gap
    west_edge = cx - box['width'] / 2 + side_margin
    east_edge = cx + box['width'] / 2 - side_margin
    west_landing_centre = west_edge + landing_depth / 2
    east_landing_centre = east_edge - landing_depth / 2
    west_landing_end = west_edge + landing_depth
    east_landing_start = east_edge - landing_depth
    risers_per_flight = 9
    total_risers = risers_per_flight * 2
    riser = FLOOR_HEIGHT / total_risers
    run_length = east_landing_start - west_landing_end
    tread = run_length / risers_per_flight
    south_flight_y = cy + (flight_width + well_gap) / 2
    north_flight_y = cy - (flight_width + well_gap) / 2

    def tag_stair_part(obj, role):
        obj['is_walkthrough_stair'] = True
        obj['floor_id'] = floor_id
        obj['stair_role'] = role
        obj['stair_detail_version'] = 1
        obj['riser_height_m'] = round(riser, 4)
        obj['tread_depth_m'] = round(tread, 4)
        obj['source_basis'] = 'corresponding floor plan stair symbol and building-core footprint'
        obj['site_measure'] = True
        return obj

    # The top storey owns the arrival landing. The full down-flight is supplied
    # by the floor below so the stacked model does not contain duplicate stairs.
    if floor_id == 'floor-3':
        landing = add_box(
            f'{floor_id}-stair-arrival-landing',
            (landing_depth, total_width, SLAB_HEIGHT),
            (west_landing_centre, cy, base_z - SLAB_HEIGHT / 2),
            mats['stone_dark'],
            bevel=0.018,
            collection=collection,
        )
        tag_stair_part(landing, 'top-storey-arrival-landing')
        for y in (cy - well_gap / 2, cy + well_gap / 2):
            post = add_box(
                f'{floor_id}-stair-arrival-post-{y:+.2f}',
                (0.05, 0.05, 0.92),
                (west_landing_end, y, base_z + 0.46),
                mats['black'],
                bevel=0.008,
                collection=collection,
            )
            tag_stair_part(post, 'arrival-guard-post')
        guard = add_cylinder_between(
            f'{floor_id}-stair-arrival-guard',
            (west_landing_end, cy - well_gap / 2, base_z + 0.92),
            (west_landing_end, cy + well_gap / 2, base_z + 0.92),
            0.035,
            mats['wood_dark'],
            collection,
        )
        tag_stair_part(guard, 'arrival-guard-handrail')
        return

    bottom_landing = add_box(
        f'{floor_id}-stair-bottom-landing',
        (landing_depth, total_width, SLAB_HEIGHT),
        (west_landing_centre, cy, base_z - SLAB_HEIGHT / 2),
        mats['stone_dark'],
        bevel=0.018,
        collection=collection,
    )
    tag_stair_part(bottom_landing, 'bottom-landing')
    half_landing = add_box(
        f'{floor_id}-stair-half-landing',
        (landing_depth, total_width, SLAB_HEIGHT),
        (east_landing_centre, cy, base_z + FLOOR_HEIGHT / 2 - SLAB_HEIGHT / 2),
        mats['stone_dark'],
        bevel=0.018,
        collection=collection,
    )
    tag_stair_part(half_landing, 'east-half-landing')

    def add_flight(name, start_x, direction, y, start_height, inner_y):
        step_centres = []
        for index in range(risers_per_flight):
            local_rise = riser * (index + 1)
            x = start_x + direction * tread * (index + 0.5)
            step = add_box(
                f'{floor_id}-stair-{name}-step-{index + 1:02d}',
                (tread + 0.012, flight_width, local_rise),
                (x, y, base_z + start_height + local_rise / 2),
                mats['stone_dark'],
                bevel=0.012,
                collection=collection,
            )
            tag_stair_part(step, f'{name}-flight-step')
            step_centres.append((x, base_z + start_height + local_rise))
        post_indices = sorted(set(range(0, risers_per_flight, 3)) | {risers_per_flight - 1})
        for index in post_indices:
            x, step_z = step_centres[index]
            post = add_box(
                f'{floor_id}-stair-{name}-rail-post-{index + 1:02d}',
                (0.05, 0.05, 0.90),
                (x, inner_y, step_z + 0.45),
                mats['black'],
                bevel=0.008,
                collection=collection,
            )
            tag_stair_part(post, f'{name}-flight-guard-post')
        rail = add_cylinder_between(
            f'{floor_id}-stair-{name}-handrail',
            (step_centres[0][0], inner_y, step_centres[0][1] + 0.90),
            (step_centres[-1][0], inner_y, step_centres[-1][1] + 0.90),
            0.035,
            mats['wood_dark'],
            collection,
        )
        tag_stair_part(rail, f'{name}-flight-continuous-handrail')

    add_flight('lower', west_landing_end, 1, south_flight_y, 0, cy + well_gap / 2)
    add_flight('upper', east_landing_start, -1, north_flight_y, FLOOR_HEIGHT / 2, cy - well_gap / 2)

    for y in (cy - well_gap / 2, cy + well_gap / 2):
        post = add_box(
            f'{floor_id}-stair-half-landing-post-{y:+.2f}',
            (0.05, 0.05, 0.90),
            (east_landing_start, y, base_z + FLOOR_HEIGHT / 2 + 0.45),
            mats['black'],
            bevel=0.008,
            collection=collection,
        )
        tag_stair_part(post, 'half-landing-guard-post')
    landing_guard = add_cylinder_between(
        f'{floor_id}-stair-half-landing-guard',
        (east_landing_start, cy - well_gap / 2, base_z + FLOOR_HEIGHT / 2 + 0.90),
        (east_landing_start, cy + well_gap / 2, base_z + FLOOR_HEIGHT / 2 + 0.90),
        0.035,
        mats['wood_dark'],
        collection,
    )
    tag_stair_part(landing_guard, 'half-landing-guard-handrail')


def add_area_light(name, location, energy, colour, size, collection, *, rotation=(0, 0, 0), use_shadow=False, shape='DISK', size_y=None):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = rgba(colour)[:3]
    data.shape = shape
    data.size = size
    if shape == 'RECTANGLE' and size_y is not None:
        data.size_y = size_y
    data.use_shadow = use_shadow
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def add_downlight(name, location, mats, collection):
    add_cylinder(f'{name}-trim', 0.11, 0.035, location, mats['black'], vertices=32, collection=collection)
    add_cylinder(f'{name}-lens', 0.078, 0.040, (location[0], location[1], location[2] - 0.012), mats['light'], vertices=32, collection=collection)


def build_floor(floor, index, mats):
    floor_id = floor['floor_id']
    base_z = index * FLOOR_HEIGHT
    collection = bpy.data.collections.new(floor_id)
    bpy.context.scene.collection.children.link(collection)
    bounds = floor['overall_bounds']
    zones = [dict(zone, bounds=dict(zone['bounds'])) for zone in floor['zones']]
    if floor_id == 'floor-1':
        for zone in zones:
            if zone['id'] == 'f1-dining':
                zone['bounds']['depth'] = 3.3
    for zone in zones:
        cx, cy = zone_centre(zone, bounds)
        box = zone['bounds']
        if 'stair' not in zone['id']:
            slab = add_box(f"{zone['id']}-slab", (box['width'] - 0.03, box['depth'] - 0.03, SLAB_HEIGHT), (cx, cy, base_z - SLAB_HEIGHT / 2), material_for_zone(floor_id, zone, mats), bevel=0.018, collection=collection)
            slab['floor_id'] = floor_id
            slab['zone_id'] = zone['id']
        if not is_exterior(zone) and 'stair' not in zone['id']:
            add_box(f"{zone['id']}-ceiling", (box['width'] - 0.10, box['depth'] - 0.10, 0.10), (cx, cy, base_z + WALL_HEIGHT + 0.05), mats['ceiling'], bevel=0.012, collection=collection)
        furnish_zone(floor_id, zone, base_z, bounds, mats, collection)
        if not is_exterior(zone) and any(token in zone['id'] for token in ('living', 'lounge', 'primary', 'dining')):
            cove_length = max(0.8, box['width'] - 0.34)
            add_box(f"{zone['id']}-cove-light", (cove_length, 0.035, 0.028), (cx, cy + box['depth'] / 2 - 0.12, base_z + 2.62), mats['light'], bevel=0.008, collection=collection)
    build_boundaries(floor, zones, base_z, mats, collection)
    add_staircase(floor, base_z, mats, collection)
    for light_index, zone in enumerate(zone for zone in zones if not is_exterior(zone) and 'stair' not in zone['id']):
        cx, cy = zone_centre(zone, bounds)
        add_downlight(f'{floor_id}-downlight-{light_index:02d}', (cx, cy, base_z + 2.78), mats, collection)
        room_light_energy = {'floor-1': 78, 'floor-2': 105, 'floor-3': 135}[floor_id]
        add_area_light(f'{floor_id}-light-{light_index:02d}', (cx, cy, base_z + 2.55), room_light_energy, '#FFD5A3', min(1.8, max(0.85, min(zone['bounds']['width'], zone['bounds']['depth']) * 0.30)), collection)
        if not STRICT_REVIEW:
            fill_width = min(4.2, max(1.4, zone['bounds']['width'] * 0.72))
            fill_depth = min(3.4, max(1.2, zone['bounds']['depth'] * 0.62))
            fill_energy = {'floor-1': 12, 'floor-2': 20, 'floor-3': 24}[floor_id]
            add_area_light(f'{floor_id}-ceiling-fill-{light_index:02d}', (cx, cy, base_z + 2.30), fill_energy, '#FFD0A0', fill_width, collection, rotation=(math.pi, 0, 0), shape='RECTANGLE', size_y=fill_depth)
    return collection


def create_review_setup(floors):
    review_collection = bpy.data.collections.new('Review Cameras')
    bpy.context.scene.collection.children.link(review_collection)
    cameras = []

    def add_review_camera(camera_id, floor, location, target, *, lens=28, ortho_scale=None, role='room-review'):
        data = bpy.data.cameras.new(camera_id)
        if ortho_scale is not None:
            data.type = 'ORTHO'
            data.ortho_scale = ortho_scale
        else:
            data.lens = lens
            data.sensor_width = 32
        data.clip_start = 0.05
        data.clip_end = 150
        camera = bpy.data.objects.new(camera_id, data)
        review_collection.objects.link(camera)
        camera.rotation_mode = 'QUATERNION'
        camera.location = location
        look_at(camera, target)
        camera['review_target'] = json.dumps([round(value, 4) for value in target])
        camera['camera_id'] = camera_id
        camera['floor_id'] = floor['floor_id']
        camera['baseline_version'] = floor['version']
        camera['review_role'] = role
        cameras.append(camera)
        return camera

    for index, floor in enumerate(floors):
        floor_id = floor['floor_id']
        base_z = index * FLOOR_HEIGHT
        bounds = floor['overall_bounds']
        span = max(bounds['width'], bounds['depth'])
        add_review_camera(
            f'{floor_id}-top-ortho',
            floor,
            (0, 0, base_z + 16),
            (0, 0, base_z),
            ortho_scale=span * 1.10,
            role='plan-and-solid-geometry-check',
        )

    by_id = {floor['floor_id']: floor for floor in floors}

    def zone_position(floor_id, zone_id, ox=0, oy=0, oz=1.58):
        floor = by_id[floor_id]
        zone = next(zone for zone in floor['zones'] if zone['id'] == zone_id)
        cx, cy = zone_centre(zone, floor['overall_bounds'])
        level = {'floor-1': 0, 'floor-2': FLOOR_HEIGHT, 'floor-3': FLOOR_HEIGHT * 2}[floor_id]
        return (cx + ox, cy + oy, level + oz)

    review_specs = (
        ('floor-1-public-axis', 'floor-1', zone_position('floor-1', 'f1-living', 0, 1.55), zone_position('floor-1', 'f1-kitchen', 0, 0, 1.10), 'public-axis-and-glazed-kitchen'),
        ('floor-1-stair-plan-review', 'floor-1', zone_position('floor-1', 'f1-stair', -2.0, 1.15, 1.45), zone_position('floor-1', 'f1-stair', 0.65, -0.35, 1.55), 'plan-aligned-dogleg-stair-review'),
        ('floor-1-wet-open', 'floor-1', zone_position('floor-1', 'f1-wet', -0.95, 0.80), zone_position('floor-1', 'f1-wet', 0.65, -0.40, 1.00), 'bathroom-without-fixed-dry-wet-screen'),
        ('floor-2-open-kitchen', 'floor-2', zone_position('floor-2', 'f2-lounge', 0, 2.55), zone_position('floor-2', 'f2-lounge', 0, -1.55, 1.00), 'open-electric-light-kitchen-in-family-lounge'),
        ('floor-2-stair-plan-review', 'floor-2', zone_position('floor-2', 'f2-stair', -2.0, 1.55, 1.45), zone_position('floor-2', 'f2-stair', 0.55, -0.30, 1.55), 'plan-aligned-dogleg-stair-review'),
        ('floor-2-wet-separated', 'floor-2', zone_position('floor-2', 'f2-wet', -0.90, 0.70), zone_position('floor-2', 'f2-wet', 0.75, 0.15, 1.00), 'dry-wet-separated-bathroom'),
        ('floor-3-study', 'floor-3', zone_position('floor-3', 'f3-study', 1.45, 1.35), zone_position('floor-3', 'f3-study', -0.65, -0.20, 1.00), 'study-game-room-and-standing-desk'),
        ('floor-3-stair-plan-review', 'floor-3', zone_position('floor-3', 'f3-stair', -2.0, 1.55, 1.45), zone_position('floor-3', 'f3-stair', 0.35, -0.25, 0.35), 'top-storey-stair-arrival-and-guard-review'),
        ('floor-3-wet-separated', 'floor-3', zone_position('floor-3', 'f3-wet', -0.90, 0.70), zone_position('floor-3', 'f3-wet', 0.75, 0.15, 1.00), 'dry-wet-separated-bathroom'),
    )
    for camera_id, floor_id, location, target, role in review_specs:
        add_review_camera(camera_id, by_id[floor_id], location, target, role=role)

    clay = make_material('Geometry Check Clay', '#D8D1C5', roughness=0.92)
    clay.diffuse_color = rgba('#D8D1C5')
    presentation = bpy.context.scene.view_layers[0]
    presentation.name = 'Presentation'
    geometry_layer = bpy.context.scene.view_layers.get('Geometry Check') or bpy.context.scene.view_layers.new('Geometry Check')
    geometry_layer.material_override = clay
    geometry_layer['purpose'] = 'neutral solid-mode evidence; other floors and ceilings are isolated by the review renderer'
    bpy.context.scene['review_camera_ids'] = json.dumps([camera.name for camera in cameras], ensure_ascii=False)
    return cameras


def look_at(camera, target):
    direction = Vector(target) - camera.location
    rotation = direction.to_track_quat('-Z', 'Y')
    camera.rotation_quaternion = rotation
    return rotation


def set_action_interpolation(camera, interpolation='LINEAR'):
    """Set keyframe interpolation for legacy and Blender 5 layered Actions."""
    action = camera.animation_data.action if camera.animation_data else None
    if not action:
        raise RuntimeError('Camera keyframes did not create an Action')
    if hasattr(action, 'fcurves'):
        fcurves = action.fcurves
    else:
        if not action.layers or not action.layers[0].strips or not action.slots:
            raise RuntimeError('Camera Action has no layered channel data')
        channelbag = action.layers[0].strips[0].channelbag(action.slots[0])
        fcurves = channelbag.fcurves
    for fcurve in fcurves:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = interpolation
        fcurve.update()


def create_camera_path(floors, frame_end, fps):
    camera_data = bpy.data.cameras.new('Walkthrough Camera')
    camera_data.lens = 25
    camera_data.sensor_width = 32
    camera_data.clip_start = 0.05
    camera_data.clip_end = 150
    camera = bpy.data.objects.new('Walkthrough Camera', camera_data)
    camera.rotation_mode = 'QUATERNION'
    bpy.context.scene.collection.objects.link(camera)
    bpy.context.scene.camera = camera

    by_id = {floor['floor_id']: floor for floor in floors}

    def position(floor_id, zone_id, ox=0, oy=0, oz=1.62):
        floor = by_id[floor_id]
        zone = next(zone for zone in floor['zones'] if zone['id'] == zone_id)
        cx, cy = zone_centre(zone, floor['overall_bounds'])
        level = {'floor-1': 0, 'floor-2': FLOOR_HEIGHT, 'floor-3': FLOOR_HEIGHT * 2}[floor_id]
        return (cx + ox, cy + oy, level + oz)

    path = [
        ('一层迎宾台', position('floor-1', 'f1-porch', 0, 0.2), position('floor-1', 'f1-hall')),
        ('一层堂屋', position('floor-1', 'f1-hall', 0, 2.4), position('floor-1', 'f1-hall', 0, -2.4, 1.25)),
        ('一层礼序端景', position('floor-1', 'f1-hall', 0, -1.1), position('floor-1', 'f1-hall', 0, -3.5, 1.35)),
        ('一层客厅', position('floor-1', 'f1-living', 0.8, 0.8), position('floor-1', 'f1-living', -1.6, -0.8, 1.0)),
        ('一层客餐连续轴', position('floor-1', 'f1-living', 0.2, -1.1), position('floor-1', 'f1-dining', 0, -0.4, 1.15)),
        ('一层餐厅', position('floor-1', 'f1-dining', 0.2, 0.8), position('floor-1', 'f1-kitchen', 0, -0.8, 1.2)),
        ('一层玻璃厨房', position('floor-1', 'f1-dining', 0, -1.1), position('floor-1', 'f1-kitchen', 0, -0.5, 1.1)),
        ('返回一层堂屋', position('floor-1', 'f1-hall', 1.45, -2.0), position('floor-1', 'f1-stair', 1.45, 1.1, 1.5)),
        ('一层楼梯起步', position('floor-1', 'f1-stair', -0.3, 1.2), position('floor-1', 'f1-stair', -0.65, -1.3, 2.8)),
        ('抵达二层', position('floor-2', 'f2-lounge', 1.6, -2.5), position('floor-2', 'f2-lounge', 1.6, 2.4, 1.15)),
        ('二层家庭厅', position('floor-2', 'f2-lounge', 1.55, -1.1), position('floor-2', 'f2-lounge', -0.3, 2.2, 1.05)),
        ('二层南阳台', position('floor-2', 'f2-lounge', 0, 2.4), position('floor-2', 'f2-south-balcony', 0, 0, 1.1)),
        ('二层西南卧室', position('floor-2', 'f2-lounge', -2.25, 1.20), position('floor-2', 'f2-west-south', 0, -0.15, 0.58)),
        ('二层湿区', position('floor-2', 'f2-lounge', 1.6, -1.9), position('floor-2', 'f2-wet', -0.8, 0, 1.2)),
        ('二层主卧', position('floor-2', 'f2-lounge', 1.70, 1.50), position('floor-2', 'f2-primary', 0, 0, 1.0)),
        ('返回二层楼梯', position('floor-2', 'f2-lounge', 0, -2.1), position('floor-2', 'f2-stair', -0.65, 1.2, 1.5)),
        ('二层楼梯起步', position('floor-2', 'f2-stair', 0.65, 1.2), position('floor-2', 'f2-stair', 0.65, -1.5, 2.8)),
        ('抵达三层', position('floor-3', 'f3-stair', 0.65, -1.5), position('floor-3', 'f3-lounge', 0, 1.4, 1.25)),
        ('三层家庭厅', position('floor-3', 'f3-lounge', 1.55, -1.0), position('floor-3', 'f3-lounge', -0.3, 2.0, 1.0)),
        ('三层景观阳台', position('floor-3', 'f3-lounge', -1.4, 0.7), position('floor-3', 'f3-landscape', 0, 0, 1.1)),
        ('三层景观回望', position('floor-3', 'f3-landscape', -0.8, 0.2), position('floor-3', 'f3-lounge', 0, 0, 1.0)),
        ('三层书房', position('floor-3', 'f3-study', 1.45, 1.20), position('floor-3', 'f3-study', -0.55, 0, 1.0)),
        ('三层湿区', position('floor-3', 'f3-lounge', 1.6, -1.9), position('floor-3', 'f3-wet', -0.7, 0, 1.2)),
        ('三层主卧', position('floor-3', 'f3-primary', -1.0, 0.7), position('floor-3', 'f3-primary', 1.0, -0.5, 1.0)),
        ('三层收束', position('floor-3', 'f3-lounge', 1.45, 1.0), position('floor-3', 'f3-landscape', 0, 0, 1.0)),
    ]
    previous_rotation = None
    arrival_frames = [1 + round(index * (frame_end - 1) / (len(path) - 1)) for index in range(len(path))]
    for index, (_, location, target) in enumerate(path):
        frame = arrival_frames[index]
        camera.location = location
        rotation = look_at(camera, target)
        if previous_rotation is not None and previous_rotation.dot(rotation) < 0:
            rotation.negate()
            camera.rotation_quaternion = rotation
        previous_rotation = rotation.copy()
        camera.keyframe_insert('location', frame=frame)
        camera.keyframe_insert('rotation_quaternion', frame=frame)
        if index < len(path) - 1:
            next_frame = arrival_frames[index + 1]
            hold_frame = frame + round((next_frame - frame) * 0.80)
            camera.keyframe_insert('location', frame=hold_frame)
            camera.keyframe_insert('rotation_quaternion', frame=hold_frame)
    # A short dwell makes room views readable; the remaining linear movement
    # avoids Bezier wall overshoot, while sign-continuous quaternions prevent
    # Euler-angle flips between viewpoints.
    set_action_interpolation(camera, 'LINEAR')
    camera['walkthrough_shots'] = json.dumps([name for name, _, _ in path], ensure_ascii=False)
    return camera, [name for name, _, _ in path]


def configure_scene(scene, args):
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.length_unit = 'METERS'
    try:
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        scene.render.engine = 'BLENDER_EEVEE'
    if hasattr(scene, 'eevee'):
        scene.eevee.taa_render_samples = args.render_samples or (4 if args.preview else 24)
        scene.eevee.taa_samples = 8 if args.preview else 24
        scene.eevee.use_fast_gi = True
        scene.eevee.fast_gi_quality = 0.35 if args.preview else 0.55
        scene.eevee.fast_gi_ray_count = 2 if args.preview else 4
        scene.eevee.fast_gi_step_count = 8 if args.preview else 12
        scene.eevee.use_raytracing = not args.preview
        scene.eevee.ray_tracing_method = 'SCREEN'
    scene.render.resolution_x = 640 if args.preview else 1280
    scene.render.resolution_y = 360 if args.preview else 540
    if not args.preview:
        scene.render.resolution_x = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.fps = args.fps
    scene.frame_start = 1
    scene.frame_end = args.frames
    scene.render.film_transparent = False
    scene.world.color = rgba('#17201C')[:3]
    if scene.world.use_nodes is False:
        scene.world.use_nodes = True
    world_nodes = scene.world.node_tree.nodes
    world_links = scene.world.node_tree.links
    world_nodes.clear()
    world_output = world_nodes.new('ShaderNodeOutputWorld')
    background = world_nodes.new('ShaderNodeBackground')
    environment = world_nodes.new('ShaderNodeTexEnvironment')
    environment.image = load_texture_image('suburban_garden_1k.hdr')
    coordinates = world_nodes.new('ShaderNodeTexCoord')
    mapping = world_nodes.new('ShaderNodeMapping')
    mapping.inputs['Rotation'].default_value[2] = math.radians(118)
    background.inputs['Strength'].default_value = 0.42
    world_links.new(coordinates.outputs['Generated'], mapping.inputs['Vector'])
    world_links.new(mapping.outputs['Vector'], environment.inputs['Vector'])
    world_links.new(environment.outputs['Color'], background.inputs['Color'])
    world_links.new(background.outputs['Background'], world_output.inputs['Surface'])
    scene.world['hdri_asset_id'] = 'suburban_garden'
    scene.world['hdri_license'] = 'CC0 1.0'
    view = scene.view_settings
    if hasattr(view, 'exposure'):
        view.exposure = -0.22
    if hasattr(view, 'look'):
        for look in ('AgX - Medium High Contrast', 'AgX - Medium High Contrast', 'Medium High Contrast'):
            try:
                view.look = look
                break
            except (TypeError, ValueError):
                pass


def add_environment(mats):
    add_box('Ground', (38, 38, 0.24), (0, 0, -0.28), mats['ground'], bevel=0.15)
    sun_data = bpy.data.lights.new('Sun', 'SUN')
    sun_data.energy = 2.6
    sun_data.angle = math.radians(5)
    sun = bpy.data.objects.new('Sun', sun_data)
    bpy.context.scene.collection.objects.link(sun)
    sun_ray_direction = Vector((-0.38, 0.56, -0.74)).normalized()
    sun.rotation_mode = 'QUATERNION'
    sun.rotation_quaternion = sun_ray_direction.to_track_quat('-Z', 'Y')
    sun['lighting_role'] = 'directional_southeast_daylight'
    for index, (x, y, scale) in enumerate(((-10, 8, 1.4), (10, 7, 1.1), (-11, -7, 1.0), (11, -8, 1.25))):
        add_plant(f'exterior-plant-{index}', (x, y), 0, mats, bpy.context.scene.collection, scale)


def build_materials():
    mats = {
        'wall': make_image_pbr_material('PBR warm mineral plaster', 'beige_wall_001', scale=(0.34, 0.34, 0.34), saturation=0.48, value=1.02, roughness_range=(0.72, 0.96), normal_strength=0.32, tint='#D9CDBB', tint_factor=0.16),
        'ceiling': make_image_pbr_material('PBR limewash ceiling', 'beige_wall_001', scale=(0.36, 0.36, 0.36), saturation=0.20, value=1.22, roughness_range=(0.82, 1.0), normal_strength=0.18, tint='#EEE7DA', tint_factor=0.24),
        'wall_f1': make_image_pbr_material('PBR floor 1 deep warm mineral plaster', 'beige_wall_001', scale=(0.48, 0.48, 0.48), saturation=0.42, value=0.46, roughness_range=(0.76, 0.98), normal_strength=0.46, tint='#514337', tint_factor=0.46),
        'ceiling_f1': make_image_pbr_material('PBR floor 1 warm mineral ceiling', 'beige_wall_001', scale=(0.46, 0.46, 0.46), saturation=0.32, value=0.52, roughness_range=(0.82, 1.0), normal_strength=0.34, tint='#655445', tint_factor=0.42),
        'wall_f3': make_image_pbr_material('PBR floor 3 greige mineral plaster', 'beige_wall_001', scale=(0.42, 0.42, 0.42), saturation=0.20, value=0.82, roughness_range=(0.76, 0.98), normal_strength=0.40, tint='#8A8379', tint_factor=0.34),
        'ceiling_f3': make_image_pbr_material('PBR floor 3 soft greige ceiling', 'beige_wall_001', scale=(0.42, 0.42, 0.42), saturation=0.16, value=0.96, roughness_range=(0.84, 1.0), normal_strength=0.26, tint='#A49D93', tint_factor=0.28),
        'stone': make_image_pbr_material('PBR floor 1 warm limestone', 'floor_tiles_02', scale=(0.28, 0.28, 0.28), saturation=0.52, value=0.92, roughness_range=(0.34, 0.62), normal_strength=0.48, tint='#A88E70', tint_factor=0.12),
        'oak': make_image_pbr_material('PBR floor 2 light oak', 'wood_floor', scale=(0.58, 0.58, 0.58), saturation=0.56, value=1.20, roughness_range=(0.34, 0.60), normal_strength=0.52, tint='#D0A875', tint_factor=0.18),
        'cement': make_image_pbr_material('PBR floor 3 warm greige stone', 'floor_tiles_02', scale=(0.25, 0.25, 0.25), saturation=0.20, value=0.84, roughness_range=(0.48, 0.74), normal_strength=0.42, tint='#80786D', tint_factor=0.28),
        'terrace': make_image_pbr_material('PBR exterior anti-slip stone', 'floor_tiles_02', scale=(0.30, 0.30, 0.30), saturation=0.26, value=0.72, roughness_range=(0.62, 0.92), normal_strength=0.62, tint='#756E63', tint_factor=0.22),
        'wet': make_image_pbr_material('PBR wet-area greige tile', 'floor_tiles_02', scale=(0.34, 0.34, 0.34), saturation=0.18, value=0.70, roughness_range=(0.40, 0.66), normal_strength=0.46, tint='#777069', tint_factor=0.30),
        'wet_light': make_image_pbr_material('PBR warm travertine tile', 'floor_tiles_02', scale=(0.28, 0.28, 0.28), saturation=0.40, value=1.06, roughness_range=(0.30, 0.56), normal_strength=0.44, tint='#D1C1A8', tint_factor=0.16),
        'wood': make_image_pbr_material('PBR walnut joinery', 'dark_wood', scale=(2.4, 2.4, 2.4), saturation=0.62, value=0.72, roughness_range=(0.30, 0.58), normal_strength=0.48, tint='#6E452B', tint_factor=0.16),
        'wood_light': make_image_pbr_material('PBR light oak joinery', 'wood_floor', scale=(2.0, 2.0, 2.0), saturation=0.54, value=1.08, roughness_range=(0.34, 0.62), normal_strength=0.50, tint='#C69D70', tint_factor=0.14),
        'wood_dark': make_image_pbr_material('PBR smoked walnut', 'dark_wood', scale=(2.35, 2.35, 2.35), saturation=0.54, value=0.54, roughness_range=(0.32, 0.58), normal_strength=0.50, tint='#3B271D', tint_factor=0.20),
        'cabinet': make_image_pbr_material('PBR dark walnut cabinetry', 'dark_wood', scale=(1.75, 1.75, 1.75), saturation=0.50, value=0.54, roughness_range=(0.36, 0.62), normal_strength=0.42, tint='#38271E', tint_factor=0.20),
        'cabinet_light': make_image_pbr_material('PBR light oak cabinetry', 'wood_floor', scale=(1.55, 1.55, 1.55), saturation=0.52, value=0.98, roughness_range=(0.38, 0.66), normal_strength=0.46, tint='#B98E61', tint_factor=0.15),
        'stone_dark': make_image_pbr_material('PBR honed dark stone', 'floor_tiles_02', scale=(0.35, 0.35, 0.35), saturation=0.12, value=0.48, roughness_range=(0.20, 0.44), normal_strength=0.34, tint='#3F3B36', tint_factor=0.44),
        'black': make_material('Blackened metal', '#171A18', roughness=0.32, metallic=0.72),
        'metal': make_material('Brushed steel', '#727570', roughness=0.28, metallic=0.78),
        'brass': make_material('Aged brass', '#8B6640', roughness=0.34, metallic=0.76),
        'glass': make_material('Low-iron glass', '#BFD2CF', roughness=0.08, alpha=0.22, transmission=0.35),
        'mirror': make_material('Smoked mirror', '#8B9895', roughness=0.05, metallic=0.88),
        'fabric': make_image_pbr_material('PBR warm taupe upholstery', 'terlenka', scale=(3.25, 3.25, 3.25), saturation=0.44, value=0.78, roughness_range=(0.72, 0.96), normal_strength=0.72, tint='#827568', tint_factor=0.30),
        'fabric_light': make_image_pbr_material('PBR cream upholstery', 'terlenka', scale=(3.25, 3.25, 3.25), saturation=0.32, value=1.12, roughness_range=(0.76, 0.98), normal_strength=0.78, tint='#E4D8C6', tint_factor=0.24),
        'curtain': make_image_pbr_material('PBR warm woven curtain', 'terlenka', scale=(4.2, 4.2, 4.2), saturation=0.28, value=0.78, roughness_range=(0.82, 1.0), normal_strength=0.82, tint='#9B8874', tint_factor=0.32),
        'leather': make_material('Saddle leather', '#68493A', roughness=0.72),
        'linen': make_image_pbr_material('PBR taupe bed linen', 'terlenka', scale=(3.0, 3.0, 3.0), saturation=0.34, value=0.90, roughness_range=(0.80, 1.0), normal_strength=0.68, tint='#A89A88', tint_factor=0.22),
        'linen_light': make_image_pbr_material('PBR ivory bed linen', 'terlenka', scale=(3.0, 3.0, 3.0), saturation=0.24, value=1.20, roughness_range=(0.82, 1.0), normal_strength=0.66, tint='#EEE5D7', tint_factor=0.20),
        'linen_accent': make_image_pbr_material('PBR clay accent linen', 'terlenka', scale=(3.0, 3.0, 3.0), saturation=0.42, value=0.82, roughness_range=(0.80, 1.0), normal_strength=0.70, tint='#8A6758', tint_factor=0.46),
        'rug': make_image_pbr_material('PBR woven greige rug', 'terlenka', scale=(2.1, 2.1, 2.1), saturation=0.24, value=0.86, roughness_range=(0.88, 1.0), normal_strength=0.92, tint='#8F8373', tint_factor=0.30),
        'porcelain': make_material('Warm white porcelain', '#E9E6DF', roughness=0.28),
        'terracotta': make_material('Dark clay', '#6D4031', roughness=0.88),
        'green': make_material('Foliage', '#405543', roughness=0.82),
        'ground': make_material('Landscape ground', '#4B5244', roughness=0.95),
        'book_accent': make_material('Muted green book cloth', '#45594C', roughness=0.88),
        'light': make_material('Warm luminous glass', '#FFF1CE', roughness=0.22, emission='#FFD39B', emission_strength=2.5),
    }
    add_procedural_finish(mats['leather'], scale=14.0, detail=3.0, bump=0.06)
    return mats


def sha256(path: Path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def write_manifest(output_dir, source_html, floors, args, shots, artifact_paths):
    artifacts = {}
    for path in artifact_paths:
        if path.exists():
            artifacts[path.name] = {'bytes': path.stat().st_size, 'sha256': sha256(path)}
    manifest = {
        'version': 1,
        'project_id': 'yj-three-floor-whole-home-2026-09-v3',
        'release_id': f'{args.artifact_stem}-strict-review-v1' if args.strict_review else 'yj-home-blender-walkthrough-v4-real-materials',
        'source_2d': os.path.relpath(source_html, output_dir).replace('\\', '/'),
        'source_2d_sha256': sha256(source_html),
        'floor_baseline_versions': {floor['floor_id']: floor['version'] for floor in floors},
        'units': 'metres',
        'render_engine': bpy.context.scene.render.engine,
        'resolution': [bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y],
        'fps': args.fps,
        'frames': args.frames,
        'duration_seconds': round(args.frames / args.fps, 2),
        'render_stride': args.render_stride,
        'rendered_source_frames': int(bpy.context.scene.get('rendered_source_frames', args.frames if args.render_stride == 1 else math.ceil(args.frames / args.render_stride))),
        'render_method': 'Adaptive exact-frame render: every moving camera frame is rendered; identical dwell frames reuse the last lossless PNG; FFmpeg performs no optical-flow synthesis.' if args.adaptive_render else ('Full timeline render' if args.render_stride == 1 else f'Blender renders every {args.render_stride}rd timeline frame; FFmpeg motion interpolation restores the declared output FPS.'),
        'camera': 'first-person, 25 mm, 1.62 m nominal eye height',
        'shots': shots,
        'asset_policy': 'Drawing-derived procedural architecture plus bundled Poly Haven CC0 1.0 PBR textures, residential-garden HDRI and selected furniture glTF models. Every remote file is checksummed and recorded in the copied PBR asset manifest.',
        'material_layers': ['diffuse colour', 'OpenGL tangent-space normal', 'roughness'],
        'real_furniture_assets': ['dining_chair_02', 'modern_arm_chair_01', 'modern_coffee_table_01'],
        'lighting': 'Poly Haven suburban_garden 1k HDRI, southeast directional Blender sun, window daylight portals, floor-specific visible downlights, kitchen counter washes and emissive practical/cove fixtures. Strict review output omits undocumented ambient ceiling-fill lights.' if args.strict_review else 'Poly Haven suburban_garden 1k HDRI, southeast directional Blender sun, window daylight portals, fast global illumination, floor-specific interior lights, kitchen counter washes and emissive practical/cove fixtures.',
        'review_protocol': 'fixed top/room cameras plus Presentation and Geometry Check view layers' if args.strict_review else 'legacy walkthrough cameras',
        'qa_design_features': {
            'floor-1': ['continuous living-dining-kitchen axis', 'full-height clear glazed kitchen partition', 'bathroom without fixed dry-wet screen', 'shrine rear remains undefined'],
            'floor-2': ['open electric light-kitchen proposed inside family lounge; MEP and gas conditions unresolved', 'dry-wet-separated bathroom'],
            'floor-3': ['study/game room with 1800 x 800 mm desk intent', 'dry-wet-separated bathroom'],
        },
        'textures_packed_into_blend': True,
        'status': 'concept visualisation; dimensions, structure, stairs, openings and MEP require site/professional verification',
        'inferred_walkthrough_access': 'Where the 2D baseline omits an internal door, a 1.05 m concept opening is added only between a public hall/lounge and a long adjacent room/wet-area edge. These openings are navigation assumptions, not drawing facts.',
        'artifacts': artifacts,
    }
    manifest_path = output_dir / f'{args.artifact_stem}-manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest_path


def render_video(scene, video_path: Path, fps: int, output_dir: Path, render_stride: int = 1, adaptive_render=False):
    """Render H.264 directly when available, otherwise use PNG + FFmpeg.

    Some Blender builds (including the local 5.2 LTS package) omit the FFMPEG
    image format even though external FFmpeg is available. The PNG fallback is
    deterministic and keeps incomplete frames in a uniquely named temp folder.
    """
    use_png_fallback = render_stride > 1 or adaptive_render
    if not use_png_fallback:
        try:
            scene.render.image_settings.file_format = 'FFMPEG'
        except TypeError:
            use_png_fallback = True
    if use_png_fallback:
        ffmpeg = shutil.which('ffmpeg')
        if not ffmpeg:
            raise RuntimeError('This Blender build has no FFMPEG output and ffmpeg was not found on PATH')
        frame_dir = Path(tempfile.mkdtemp(prefix='yj-home-frames-', dir=output_dir))
        try:
            scene.render.image_settings.file_format = 'PNG'
            if adaptive_render:
                camera = scene.camera
                if camera is None:
                    raise RuntimeError('Adaptive render requires an active scene camera')
                render_frames = [scene.frame_start]
                scene.frame_set(scene.frame_start)
                previous_location = camera.matrix_world.translation.copy()
                previous_rotation = camera.matrix_world.to_quaternion()
                for frame in range(scene.frame_start + 1, scene.frame_end + 1):
                    scene.frame_set(frame)
                    location = camera.matrix_world.translation.copy()
                    rotation = camera.matrix_world.to_quaternion()
                    moved = (location - previous_location).length > 1e-6 or abs(rotation.dot(previous_rotation)) < 1 - 1e-8
                    if moved:
                        render_frames.append(frame)
                    previous_location = location
                    previous_rotation = rotation
                if render_frames[-1] != scene.frame_end:
                    render_frames.append(scene.frame_end)
            else:
                render_frames = list(range(scene.frame_start, scene.frame_end + 1, render_stride))
            scene['rendered_source_frames'] = len(render_frames)
            rendered_paths = {}
            for output_index, frame in enumerate(render_frames, start=1):
                scene.frame_set(frame)
                source_number = frame if adaptive_render else output_index
                source_path = frame_dir / f'source_{source_number:04d}.png'
                scene.render.filepath = str(source_path)
                bpy.ops.render.render(write_still=True)
                rendered_paths[frame] = source_path
            if adaptive_render:
                rendered_set = set(render_frames)
                last_rendered = render_frames[0]
                for frame in range(scene.frame_start, scene.frame_end + 1):
                    if frame in rendered_set:
                        last_rendered = frame
                    timeline_path = frame_dir / f'frame_{frame:04d}.png'
                    try:
                        os.link(rendered_paths[last_rendered], timeline_path)
                    except OSError:
                        shutil.copy2(rendered_paths[last_rendered], timeline_path)
                frame_pattern = str(frame_dir / 'frame_%04d.png')
                source_fps = fps
            else:
                frame_pattern = str(frame_dir / 'source_%04d.png')
                source_fps = fps / render_stride
            command = [
                ffmpeg,
                '-hide_banner',
                '-loglevel', 'warning',
                '-y',
                '-framerate', f'{source_fps:g}',
                '-start_number', '1',
                '-i', frame_pattern,
            ]
            if render_stride > 1 and not adaptive_render:
                command.extend(['-vf', f'tpad=stop_mode=clone:stop_duration=1,minterpolate=fps={fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir', '-frames:v', str(scene.frame_end - scene.frame_start + 1)])
            command.extend([
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '18',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-an',
                str(video_path),
            ])
            subprocess.run(
                command,
                check=True,
            )
        finally:
            shutil.rmtree(frame_dir, ignore_errors=True)
        return
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'MEDIUM'
    scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
    scene.render.ffmpeg.audio_codec = 'NONE'
    scene.render.filepath = str(video_path)
    bpy.ops.render.render(animation=True)


def main():
    global STRICT_REVIEW
    args = parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{2,63}', args.artifact_stem):
        raise RuntimeError('--artifact-stem must be 3-64 lowercase kebab-case characters')
    STRICT_REVIEW = args.strict_review
    if args.render_stride < 1:
        raise RuntimeError('--render-stride must be at least 1')
    source_html = args.source_html.resolve()
    output_dir = args.output_dir.resolve()
    if not source_html.is_file():
        raise RuntimeError(f'Source HTML not found: {source_html}')
    output_dir.mkdir(parents=True, exist_ok=True)
    html = source_html.read_text(encoding='utf-8')
    floors = extract_json_script(html, 'floorBaselines')
    if [floor['floor_id'] for floor in floors] != ['floor-1', 'floor-2', 'floor-3']:
        raise RuntimeError('Expected floor-1, floor-2 and floor-3 in source HTML')
    blend_path = output_dir / f'{args.artifact_stem}.blend'
    glb_path = output_dir / f'{args.artifact_stem}.glb'
    poster_path = output_dir / f'{args.artifact_stem}-poster.png'
    video_path = output_dir / f'{args.artifact_stem}.mp4'
    pbr_manifest_path = output_dir / f'{args.artifact_stem}-pbr-assets.json'
    source_pbr_manifest = PBR_ROOT / 'manifest.json'
    if not source_pbr_manifest.is_file():
        raise RuntimeError(f'Missing PBR manifest: {source_pbr_manifest}. Run scripts/fetch-blender-pbr-assets.mjs first.')
    shutil.copy2(source_pbr_manifest, pbr_manifest_path)
    if args.render_existing:
        scene = bpy.context.scene
        args.frames = scene.frame_end
        args.fps = scene.render.fps
        camera = scene.camera
        shots = json.loads(camera.get('walkthrough_shots', '[]')) if camera else []
        if args.render_video:
            if args.render_samples and hasattr(scene, 'eevee'):
                scene.eevee.taa_render_samples = args.render_samples
            render_video(scene, video_path, args.fps, output_dir, args.render_stride, args.adaptive_render)
        manifest_path = write_manifest(output_dir, source_html, floors, args, shots, [blend_path, glb_path, poster_path, video_path, pbr_manifest_path])
        print(json.dumps({'video': str(video_path) if args.render_video else None, 'manifest': str(manifest_path)}, ensure_ascii=False, indent=2))
        return
    clear_scene()
    scene = bpy.context.scene
    configure_scene(scene, args)
    mats = build_materials()
    add_environment(mats)
    for index, floor in enumerate(floors):
        floor_mats = dict(mats)
        if floor['floor_id'] == 'floor-1':
            floor_mats['wall'] = mats['wall_f1']
            floor_mats['ceiling'] = mats['ceiling_f1']
            floor_mats['curtain'] = mats['fabric']
        elif floor['floor_id'] == 'floor-3':
            floor_mats['wall'] = mats['wall_f3']
            floor_mats['ceiling'] = mats['ceiling_f3']
        build_floor(floor, index, floor_mats)
    camera, shots = create_camera_path(floors, args.frames, args.fps)
    if args.strict_review:
        create_review_setup(floors)
        scene['source_html'] = os.path.relpath(source_html, output_dir).replace('\\', '/')
        scene['floor_baseline_versions'] = json.dumps({floor['floor_id']: floor['version'] for floor in floors})
        scene['concept_limit'] = 'zonal plan reconstruction; verify exact walls, structure, openings and MEP on site'
    scene.frame_set(1)

    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    if args.iteration_only:
        print(json.dumps({'blend': str(blend_path), 'iteration_only': True}, ensure_ascii=False, indent=2))
        return
    try:
        bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format='GLB', export_apply=True, export_cameras=True, export_lights=True)
    except Exception as error:
        print(f'GLB export skipped: {error}')

    scene.render.filepath = str(poster_path)
    scene.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)

    if args.render_video:
        render_video(scene, video_path, args.fps, output_dir, args.render_stride, args.adaptive_render)

    manifest_path = write_manifest(output_dir, source_html, floors, args, shots, [blend_path, glb_path, poster_path, video_path, pbr_manifest_path])
    print(json.dumps({'blend': str(blend_path), 'glb': str(glb_path), 'poster': str(poster_path), 'video': str(video_path) if args.render_video else None, 'manifest': str(manifest_path)}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
