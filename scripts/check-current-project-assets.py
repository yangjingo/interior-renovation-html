"""Check the current project's professional asset names and source links."""

import base64
import hashlib
import json
import re
from pathlib import Path


root = Path(__file__).resolve().parents[1]
work = root / 'example/work'
render_root = work / 'room-renders'
drawing_root = work / 'drawing-evidence'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_file(relative, expected_sha256=None, expected_bytes=None):
    path = root / relative
    if not path.resolve().is_relative_to(root.resolve()) or path.is_symlink() or not path.is_file():
        raise ValueError(f'Missing, linked or external project file: {relative}')
    if expected_sha256 and sha256(path) != expected_sha256:
        raise ValueError(f'Checksum mismatch: {relative}')
    if expected_bytes is not None and path.stat().st_size != expected_bytes:
        raise ValueError(f'Byte count mismatch: {relative}')
    return path


if {item.name for item in render_root.iterdir()} != {'floor1', 'floor2', 'floor3'}:
    raise ValueError('room-renders must contain exactly floor1, floor2 and floor3')

render_hashes = set()
status_counts = {'current': 0, 'previous': 0}
for floor in range(1, 4):
    floor_dir = render_root / f'floor{floor}'
    for version_dir in floor_dir.iterdir():
        if not version_dir.is_dir() or not re.fullmatch(r'v\d+', version_dir.name):
            raise ValueError(f'Unexpected render version directory: {version_dir}')
        version = version_dir.name
        manifest = json.loads((version_dir / 'version.json').read_text(encoding='utf-8'))
        if manifest['floor'] != f'floor{floor}' or manifest['render_release'] != version:
            raise ValueError(f'Render manifest floor/version mismatch: {version_dir}')
        if len(manifest['assets']) != 1:
            raise ValueError(f'Expected one accepted overall view: {version_dir}')
        asset = manifest['assets'][0]
        relative = asset['file']
        expected = f'example/work/room-renders/floor{floor}/{version}/floor{floor}-overall-render-{version}'
        if relative not in {expected + '.png', expected + '.webp'}:
            raise ValueError(f'Nonstandard whole-floor render name: {relative}')
        if asset['asset_id'] != f'floor{floor}OverallRender{version.upper()}':
            raise ValueError(f'Render ID and accepted version differ: {relative}')
        status_counts[asset['status']] += 1
        checked_file(relative, asset['sha256'], asset['bytes'])
        for original in asset.get('original_inputs', []):
            checked_file(original['file'], original['sha256'])
        if asset['status'] == 'current':
            render_hashes.add(asset['sha256'])
            checked_file(asset['related_circulation_html'], asset['related_circulation_sha256'])
            if asset['related_cad_plan'] != f'example/work/drawing-evidence/floor{floor}-source-cad-plan.png':
                raise ValueError(f'Nonstandard CAD source plan name: floor {floor}')
            checked_file(asset['related_cad_plan'])

if status_counts != {'current': 3, 'previous': 3}:
    raise ValueError(f'Expected one current and one previous overall view per floor: {status_counts}')

expected_dirs = {'review-sheet-extracts', 'source-sheet-extracts'}
if {item.name for item in drawing_root.iterdir() if item.is_dir()} != expected_dirs:
    raise ValueError('Drawing evidence folder names differ from the project index')

records = json.loads((drawing_root / 'asset-provenance.json').read_text(encoding='utf-8'))
if len(records) != 13:
    raise ValueError(f'Expected 13 reviewed construction drawing extracts; found {len(records)}')
for asset in records:
    relative = asset['file']
    if not re.fullmatch(r'example/work/drawing-evidence/review-sheet-extracts/floor[123]-(?:architectural-floor-plan|plumbing-plan|electrical-socket-plan|current-architectural-plan-detail|current-structural-(?:beam|slab)-plan)\.webp', relative):
        raise ValueError(f'Nonstandard drawing extract name: {relative}')
    checked_file(relative, asset['sha256'], asset['bytes'])

source_files = list((drawing_root / 'source-sheet-extracts').iterdir())
if len(source_files) != 12 or any(not item.is_file() or not item.name.endswith('.png') for item in source_files):
    raise ValueError('Source-sheet extract count or format changed')
room_index = json.loads((drawing_root / 'room-design-index.json').read_text(encoding='utf-8'))
if set(room_index) != {'floor-1', 'floor-2', 'floor-3'}:
    raise ValueError('Room design index is missing a floor')

html = (root / 'example/output-html/room.html').read_text(encoding='utf-8')
embedded = re.findall(r'<img src="data:image/png;base64,([A-Za-z0-9+/=]+)"', html)
if len(embedded) != 3 or {hashlib.sha256(base64.b64decode(item, validate=True)).hexdigest() for item in embedded} != render_hashes:
    raise ValueError('Displayed overview images differ from current accepted renders')

print(json.dumps({'floors': 3, 'current_overall_renders': 3, 'previous_overall_renders': 3,
                  'review_sheet_extracts': len(records), 'source_sheet_extracts': len(source_files),
                  'displayed_overviews_verified': len(embedded)}, ensure_ascii=False))
