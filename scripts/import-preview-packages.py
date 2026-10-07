"""Import the three user-supplied preview packages into the fixed floor layout."""

import hashlib
import json
import re
import zipfile
from pathlib import Path

from PIL import Image
from theme_circulation import marker, theme_circulation


root = Path(__file__).resolve().parents[1]
work = root / 'example/work'
archive_dir = root / 'example/input/archives'
versions = {1: 'v20', 2: 'v25', 3: 'v25'}
expected_archives = {
    1: '一层-CAD图-预览图-动线图.zip',
    2: '二层-CAD图_预览图_动线图.zip',
    3: '三层图纸资料包.zip',
}


def sha256(payload):
    return hashlib.sha256(payload).hexdigest()


def write_checked(target, payload):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.read_bytes() != payload:
        raise FileExistsError(f'Existing import differs: {target}')
    target.write_bytes(payload)


for floor, archive_name in expected_archives.items():
    archive = archive_dir / archive_name
    if not archive.is_file():
        raise FileNotFoundError(archive)
    with zipfile.ZipFile(archive) as package:
        files = {}
        for item in package.infolist():
            if item.is_dir() or Path(item.filename).name != item.filename or item.file_size > 12_000_000:
                raise ValueError(f'Unexpected archive entry: {archive_name} / {item.filename}')
            kind = 'cad' if 'CAD' in item.filename else 'preview' if '预览' in item.filename else 'circulation' if '动线' in item.filename else None
            if kind is None or kind in files:
                raise ValueError(f'Unknown or duplicate entry: {item.filename}')
            expected_suffix = '.html' if kind == 'circulation' else '.png'
            if Path(item.filename).suffix.lower() != expected_suffix:
                raise ValueError(f'Wrong entry format: {item.filename}')
            files[kind] = package.read(item)
        if set(files) != {'cad', 'preview', 'circulation'}:
            raise ValueError(f'Incomplete archive: {archive_name}')
    for kind in ('cad', 'preview'):
        import io
        with Image.open(io.BytesIO(files[kind])) as image:
            image.load()
            if image.width < 1200 or image.height < 900:
                raise ValueError(f'Unexpected {kind} dimensions on floor {floor}: {image.size}')
    html = files['circulation'].decode('utf-8')
    embedded = re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)', html)
    if len(embedded) != 2:
        raise ValueError(f'Circulation HTML must include preview and CAD on floor {floor}')
    import base64
    embedded_hashes = {sha256(base64.b64decode(value, validate=True)) for value in embedded}
    if embedded_hashes != {sha256(files['preview']), sha256(files['cad'])}:
        raise ValueError(f'Circulation images differ from package images on floor {floor}')
    if re.search(r'\bfetch\s*\(|\bXMLHttpRequest\b|<(?:script|link|img)[^>]+(?:src|href)=["\']https?://', html):
        raise ValueError(f'External dependency in circulation HTML on floor {floor}')

    version = versions[floor]
    asset_id = f'floor{floor}OverallRender{version.upper()}'
    preview = work / f'room-renders/floor{floor}/{version}/floor{floor}-overall-render-{version}.png'
    cad = work / f'drawing-evidence/floor{floor}-source-cad-plan.png'
    circulation = work / f'circulation-design/floor{floor}-circulation.html'
    themed_circulation = theme_circulation(html, floor).encode('utf-8')
    write_checked(preview, files['preview'])
    write_checked(cad, files['cad'])
    if circulation.exists():
        prior = circulation.read_bytes()
        if prior != files['circulation'] and marker.encode('utf-8') not in prior and prior != themed_circulation:
            raise FileExistsError(f'Unexpected circulation source: {circulation}')
    circulation.write_bytes(themed_circulation)
    record = {
        'schema_version': 1,
        'floor': f'floor{floor}',
        'render_release': version,
        'retention_policy': 'latest two accepted revisions per design view',
        'assets': [{
            'asset_id': asset_id,
            'file': preview.relative_to(root).as_posix(),
            'sha256': sha256(files['preview']),
            'bytes': len(files['preview']),
            'status': 'current',
            'provenance': {
                'type': 'static-3d-preview',
                'floor_id': f'floor-{floor}',
                'origin': f'User-supplied {archive_name}; exact PNG retained',
                'rights_note': 'Private project concept use',
                'contains_private_plan': False,
                'review_status': 'Visual proposal only; openings, structure and services require drawing and site confirmation.',
            },
            'related_circulation_html': circulation.relative_to(root).as_posix(),
            'related_circulation_sha256': sha256(themed_circulation),
            'circulation_theme': 'yj-home-v31',
            'related_cad_plan': cad.relative_to(root).as_posix(),
            'source_archive_sha256': sha256(archive.read_bytes()),
        }],
    }
    manifest = preview.parent / 'version.json'
    manifest.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'floor{floor} {version}: preview={len(files["preview"])} CAD={len(files["cad"])} circulation={len(files["circulation"])}')
