"""Create a versioned Blender lighting pass from an approved renovation model."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


FLOOR_BASE_Z = {'floor-1': 0.0, 'floor-2': 3.2, 'floor-3': 6.4}
WARM_2700 = (1.0, 0.58, 0.32)
WARM_3000 = (1.0, 0.69, 0.45)
WARM_3500 = (1.0, 0.79, 0.61)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--plan-output', type=Path, required=True)
    return parser.parse_args(argv)


def clear_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        return
    for obj in list(collection.all_objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def floor_collection(floor_id):
    parent = bpy.data.collections.get(floor_id)
    if parent is None:
        raise RuntimeError(f'Missing floor collection: {floor_id}')
    name = f'{floor_id}-lighting-v8'
    clear_collection(name)
    collection = bpy.data.collections.new(name)
    parent.children.link(collection)
    return collection


def link_active(collection):
    obj = bpy.context.object
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def make_emissive_material(name, colour, strength):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (*colour, 1.0)
    emission.inputs['Strength'].default_value = strength
    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    material['lighting_role'] = 'visible luminaire source'
    material['imagen_reference_role'] = 'warmth and surface response only'
    return material


def make_metal_material():
    name = 'v8-luminaire-dark-bronze'
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    principled = material.node_tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = (0.045, 0.035, 0.025, 1.0)
    principled.inputs['Metallic'].default_value = 0.72
    principled.inputs['Roughness'].default_value = 0.32
    return material


def add_cube(name, location, dimensions, material, collection):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = link_active(collection)
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    return obj


def add_cylinder(name, location, radius, depth, material, collection, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = link_active(collection)
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj


def add_bulb(name, location, radius, material, collection):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=radius, location=location)
    obj = link_active(collection)
    obj.name = name
    obj.data.materials.append(material)
    return obj


def tag(block, floor_id, fixture_type, cct, purpose):
    block['floor_id'] = floor_id
    block['fixture_type'] = fixture_type
    block['colour_temperature_k'] = cct
    block['purpose'] = purpose
    block['visible_source'] = True
    block['lighting_version'] = 8


def add_point(name, location, energy, radius, colour, floor_id, fixture_type, purpose, collection, cct):
    data = bpy.data.lights.new(name, type='POINT')
    data.energy = energy
    data.color = colour
    data.shadow_soft_size = radius
    data.use_shadow = fixture_type in {'pendant', 'floor-lamp'}
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.location = location
    tag(obj, floor_id, fixture_type, cct, purpose)
    tag(data, floor_id, fixture_type, cct, purpose)
    return obj


def add_spot(name, location, target, energy, colour, floor_id, fixture_type, purpose, collection, cct):
    data = bpy.data.lights.new(name, type='SPOT')
    data.energy = energy
    data.color = colour
    data.shadow_soft_size = 0.18
    data.use_shadow = True
    data.spot_size = math.radians(54)
    data.spot_blend = 0.72
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.location = location
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (Vector(target) - obj.location).to_track_quat('-Z', 'Y')
    tag(obj, floor_id, fixture_type, cct, purpose)
    tag(data, floor_id, fixture_type, cct, purpose)
    return obj


def infer_floor(name):
    prefix = name.lower()[:2]
    return {'f1': 'floor-1', 'f2': 'floor-2', 'f3': 'floor-3'}.get(prefix)


def activate_existing_fixtures(collections, bulb_material):
    records = []
    shades = [
        obj for obj in bpy.data.objects
        if obj.type == 'MESH' and 'shade' in obj.name.lower()
        and ('lamp' in obj.name.lower() or 'pendant' in obj.name.lower())
        and not obj.name.startswith('v8-')
    ]
    for shade in shades:
        floor_id = infer_floor(shade.name)
        if floor_id is None:
            continue
        location = shade.matrix_world.translation.copy()
        lowered = shade.name.lower()
        if 'pendant' in lowered:
            fixture_type, energy, radius, offset, cct, colour = 'pendant', 72, 0.24, -0.12, 3000, WARM_3000
        elif 'floor-lamp' in lowered:
            fixture_type, energy, radius, offset, cct, colour = 'floor-lamp', 46, 0.30, -0.04, 2700, WARM_2700
        else:
            fixture_type, energy, radius, offset, cct, colour = 'bedside-lamp', 22, 0.18, -0.03, 2700, WARM_2700
        bulb_location = (location.x, location.y, location.z + offset)
        safe_name = shade.name.replace('shade', 'source')
        add_bulb(f'v8-{safe_name}-bulb', bulb_location, 0.055, bulb_material, collections[floor_id])
        add_point(f'v8-{safe_name}-light', bulb_location, energy, radius, colour, floor_id, fixture_type, 'ambient and local reading light', collections[floor_id], cct)
        records.append({'floor_id': floor_id, 'fixture_id': f'v8-{safe_name}', 'type': fixture_type, 'cct_k': cct, 'visible_source': True})
    return records


def add_vanity_bar(floor_id, mirror_name, collection, metal, panel_material):
    mirror = bpy.data.objects.get(mirror_name)
    if mirror is None:
        raise RuntimeError(f'Missing vanity mirror: {mirror_name}')
    location = mirror.matrix_world.translation
    z = location.z + mirror.dimensions.z * 0.5 + 0.15
    body_location = (location.x, location.y + 0.02, z)
    add_cube(f'v8-{floor_id}-vanity-bar-body', body_location, (0.78, 0.07, 0.09), metal, collection)
    add_cube(f'v8-{floor_id}-vanity-bar-diffuser', (location.x, location.y + 0.065, z), (0.68, 0.025, 0.055), panel_material, collection)
    add_point(f'v8-{floor_id}-vanity-bar-light', (location.x, location.y + 0.28, z - 0.06), 54, 0.34, WARM_3500, floor_id, 'vanity-bar', 'face and basin task light', collection, 3500)
    return {'floor_id': floor_id, 'fixture_id': f'v8-{floor_id}-vanity-bar', 'type': 'vanity-bar', 'cct_k': 3500, 'visible_source': True}


def add_study_lamp(collection, metal, bulb_material):
    floor_id = 'floor-3'
    base = (-5.82, -2.42, 7.23)
    add_cylinder('v8-floor-3-study-lamp-base', base, 0.10, 0.03, metal, collection)
    add_cylinder('v8-floor-3-study-lamp-stem', (-5.82, -2.42, 7.44), 0.018, 0.40, metal, collection, rotation=(0, 0.22, 0))
    add_cylinder('v8-floor-3-study-lamp-head', (-5.76, -2.42, 7.62), 0.08, 0.13, metal, collection, rotation=(0, math.pi / 2, 0))
    add_bulb('v8-floor-3-study-lamp-bulb', (-5.69, -2.42, 7.60), 0.032, bulb_material, collection)
    add_spot('v8-floor-3-study-lamp-light', (-5.69, -2.42, 7.60), (-5.38, -2.58, 7.18), 52, WARM_3500, floor_id, 'desk-lamp', 'focused desk task light', collection, 3500)
    return {'floor_id': floor_id, 'fixture_id': 'v8-floor-3-study-lamp', 'type': 'desk-lamp', 'cct_k': 3500, 'visible_source': True}


def add_kitchen_strip(collection, panel_material):
    floor_id = 'floor-1'
    add_cube('v8-floor-1-kitchen-task-strip', (-4.60, -6.17, 1.42), (2.55, 0.035, 0.035), panel_material, collection)
    add_point('v8-floor-1-kitchen-task-light-a', (-5.35, -6.10, 1.38), 34, 0.22, WARM_3000, floor_id, 'under-cabinet-strip', 'counter task light', collection, 3000)
    add_point('v8-floor-1-kitchen-task-light-b', (-3.85, -6.10, 1.38), 34, 0.22, WARM_3000, floor_id, 'under-cabinet-strip', 'counter task light', collection, 3000)
    return {'floor_id': floor_id, 'fixture_id': 'v8-floor-1-kitchen-task-strip', 'type': 'under-cabinet-strip', 'cct_k': 3000, 'visible_source': True}


def add_review_camera(name, floor_id, location, target):
    collection = bpy.data.collections.get('Review Cameras')
    if collection is None:
        collection = bpy.data.collections.new('Review Cameras')
        bpy.context.scene.collection.children.link(collection)
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    data = bpy.data.cameras.new(name)
    data.lens = 27
    data.sensor_width = 32
    data.clip_start = 0.05
    data.clip_end = 150
    camera = bpy.data.objects.new(name, data)
    collection.objects.link(camera)
    camera.location = location
    camera.rotation_mode = 'QUATERNION'
    camera.rotation_quaternion = (Vector(target) - camera.location).to_track_quat('-Z', 'Y')
    camera['camera_id'] = name
    camera['floor_id'] = floor_id
    camera['baseline_version'] = 3 if floor_id == 'floor-1' else 2
    camera['review_role'] = 'lifestyle-lighting-bedroom'
    camera['review_target'] = json.dumps(target)


def rebalance_existing_light():
    for obj in bpy.data.objects:
        if obj.type != 'LIGHT' or obj.name.startswith('v8-'):
            continue
        data = obj.data
        original = float(data.get('pre_v8_energy', data.energy))
        data['pre_v8_energy'] = original
        lowered = obj.name.lower()
        if obj.name == 'Sun':
            data.energy = 1.05
        elif 'daylight' in lowered:
            data.energy = original * 0.34
        elif '-light-' in lowered:
            data.energy = original * 0.48
            data.color = WARM_3000
        elif 'counter-wash' in lowered:
            data.energy = original * 0.68
    world = bpy.context.scene.world
    if world and world.use_nodes:
        background = next((node for node in world.node_tree.nodes if node.type == 'BACKGROUND'), None)
        if background:
            background['pre_v8_strength'] = float(background.get('pre_v8_strength', background.inputs['Strength'].default_value))
            background.inputs['Strength'].default_value = 0.22


def main():
    args = parse_args()
    output = args.output.resolve()
    plan_output = args.plan_output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    plan_output.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0

    collections = {floor_id: floor_collection(floor_id) for floor_id in FLOOR_BASE_Z}
    bulb_material = make_emissive_material('v8-warm-bulb-2700k', WARM_2700, 7.5)
    panel_material = make_emissive_material('v8-warm-diffuser-3000k', WARM_3000, 4.2)
    metal = make_metal_material()

    rebalance_existing_light()
    records = activate_existing_fixtures(collections, bulb_material)
    records.extend([
        add_vanity_bar('floor-1', 'f1-wet-mirror', collections['floor-1'], metal, panel_material),
        add_vanity_bar('floor-2', 'f2-wet-mirror', collections['floor-2'], metal, panel_material),
        add_vanity_bar('floor-3', 'f3-wet-mirror', collections['floor-3'], metal, panel_material),
        add_study_lamp(collections['floor-3'], metal, bulb_material),
        add_kitchen_strip(collections['floor-1'], panel_material),
    ])

    add_review_camera('v8-floor-1-bedroom-lighting', 'floor-1', (3.45, 4.10, 1.48), (5.35, 2.35, 0.82))
    add_review_camera('v8-floor-2-bedroom-lighting', 'floor-2', (3.45, 4.10, 4.68), (5.35, 2.35, 4.02))
    add_review_camera('v8-floor-3-bedroom-lighting', 'floor-3', (3.45, 4.10, 7.88), (5.35, 2.35, 7.22))

    scene = bpy.context.scene
    scene['lighting_version'] = 8
    scene['lighting_strategy'] = 'evening ambient with visible practical fixtures and reduced broad fill'
    scene['lighting_fixture_count'] = len(records)
    scene['lighting_review_cameras'] = json.dumps([
        'floor-1-public-axis', 'v8-floor-1-bedroom-lighting',
        'floor-2-open-kitchen', 'v8-floor-2-bedroom-lighting',
        'floor-3-study', 'v8-floor-3-bedroom-lighting',
    ])
    scene.render.filepath = '//review-lighting/yj-v8-'

    plan = {
        'version': 1,
        'lighting_version': 8,
        'model': output.name,
        'strategy': 'visible-source layered evening lighting; broad daylight and ceiling fill reduced',
        'fixture_count': len(records),
        'fixtures': records,
        'colour_temperatures': {
            'bedside_and_floor_lamps': 2700,
            'pendants_and_kitchen_task': 3000,
            'vanity_and_study_task': 3500,
        },
        'safety_note': 'Concept lighting only; final circuits, IP ratings, emergency lighting and load calculations require a qualified local electrician or lighting designer.',
    }
    plan_output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False)
    print(json.dumps({'blend': str(output), 'lighting_plan': str(plan_output), 'fixtures': len(records)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
