"""Apply the current yj-home palette to archived circulation HTML."""

from pathlib import Path


script_dir = Path(__file__).resolve().parent
marker = '/* YJ HOME CIRCULATION THEME V31:'


def theme_circulation(source, floor):
    if floor not in (1, 2, 3):
        raise ValueError(f'Unknown floor: {floor}')
    if source.count('</style>') != 1 or marker in source:
        raise ValueError('Expected one unthemed stylesheet in the archived circulation HTML')
    name = 'circulation-theme-floor3.css' if floor == 3 else 'circulation-theme-floor12.css'
    css = (script_dir / name).read_text(encoding='utf-8').strip()
    if not css.startswith(marker):
        raise ValueError(f'Missing theme marker: {name}')
    return source.replace('</style>', f'\n{css}\n</style>', 1)
