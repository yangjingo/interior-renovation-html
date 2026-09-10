"""Render selected walkthrough frames for fast visual review in Blender."""

import argparse
import sys
from pathlib import Path

import bpy


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--frames', required=True, help='Comma-separated timeline frames.')
    return parser.parse_args(argv)


def main():
    args = parse_args()
    frames = [int(value.strip()) for value in args.frames.split(',') if value.strip()]
    if not frames:
        raise RuntimeError('At least one audit frame is required')
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'PNG'
    for index, frame in enumerate(frames, start=1):
        scene.frame_set(frame)
        scene.render.filepath = str(output_dir / f'audit_{index:03d}_frame_{frame:03d}.png')
        bpy.ops.render.render(write_still=True)
        print(f'Rendered audit frame {frame}')


if __name__ == '__main__':
    main()
