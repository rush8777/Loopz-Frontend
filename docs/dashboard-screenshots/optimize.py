#!/usr/bin/env python3
"""Optimize authenticated cloud captures after manual content/privacy review.

No browser, account, database, or application changes are made by this script.
Requires Pillow in the cloud Python environment; no app dependency is added.
"""
import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = ROOT / 'apps/website/src/assets/dashboard'
REQUIRED_REVIEWS = ('authenticCloudCapture', 'syntheticDataOnly', 'sensitiveDataReview')


def validate(inventory):
    seen = set()
    for entry in inventory['screenshots']:
        if entry['id'] in seen:
            raise ValueError(f"Duplicate screenshot ID: {entry['id']}")
        seen.add(entry['id'])
        if not re.fullmatch(r'movcues-[a-z0-9]+(?:-[a-z0-9]+)*\.webp', entry['filename']):
            raise ValueError(f"Invalid filename: {entry['filename']}")
        target = (ROOT / entry['assetPath']).resolve()
        if not target.is_relative_to(ASSET_ROOT.resolve()) or target.name != entry['filename']:
            raise ValueError(f"Invalid asset path: {entry['assetPath']}")
        for article in entry['articles']:
            source = (ROOT / article['sourceFile']).resolve()
            if not source.is_relative_to(ROOT / 'apps/website/src/content/docs/docs') or not source.is_file():
                raise ValueError(f"Missing article: {article['sourceFile']}")
        if entry['status'] in ('captured', 'optimized', 'integrated'):
            if entry['captureSource'] != 'cloud-browser' or not entry['capturedAt']:
                raise ValueError(f"Missing capture provenance: {entry['id']}")
            if not all(entry['verification'].get(key) for key in REQUIRED_REVIEWS):
                raise ValueError(f"Complete authenticity/data/privacy reviews first: {entry['id']}")
            if not isinstance(entry['alt'], str) or not entry['alt'].strip():
                raise ValueError(f"Write alt text from the actual capture: {entry['id']}")
        if entry['status'] in ('optimized', 'integrated'):
            with Image.open(target) as actual:
                if actual.format != 'WEBP' or list(actual.size) != entry['optimizedDimensions']:
                    raise ValueError(f"Image metadata mismatch: {entry['id']}")
            if target.stat().st_size != entry['finalFileSizeBytes']:
                raise ValueError(f"Image byte count mismatch: {entry['id']}")
            for variant in entry['responsiveVariants']:
                path = (ROOT / variant['path']).resolve()
                if not path.is_relative_to(ASSET_ROOT.resolve()):
                    raise ValueError(f"Invalid variant path: {entry['id']}")
                with Image.open(path) as actual:
                    if actual.format != 'WEBP' or list(actual.size) != [variant['width'], variant['height']]:
                        raise ValueError(f"Variant metadata mismatch: {entry['id']}")
                if path.stat().st_size != variant['bytes']:
                    raise ValueError(f"Variant byte count mismatch: {entry['id']}")


def optimize(entry, capture_root, lossless, variants=True):
    original = (capture_root / entry['originalFile']).resolve()
    if not original.is_relative_to(capture_root) or original.is_relative_to(ROOT):
        raise ValueError('Original captures must stay inside the external capture directory, outside the repository.')
    target = ROOT / entry['assetPath']
    with Image.open(original) as source:
        source.load()
        clean = ImageOps.exif_transpose(source).convert('RGB')
    entry['originalDimensions'] = list(clean.size)
    if entry.get('crop'):
        left, top, right, bottom = entry['crop']
        if not (0 <= left < right <= clean.width and 0 <= top < bottom <= clean.height):
            raise ValueError(f"Crop outside source bounds: {entry['id']}")
        clean = clean.crop((left, top, right, bottom))
    width = min(clean.width, 1440)
    master = clean if width == clean.width else clean.resize((width, round(clean.height * width / clean.width)), Image.Resampling.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    # Do not carry EXIF/ICC or other source metadata into public screenshots.
    temporary = target.with_suffix('.webp.tmp')
    master.save(temporary, 'WEBP', quality=92, method=6, lossless=lossless, exact=True)
    temporary.replace(target)
    entry['optimizedDimensions'] = list(master.size)
    entry['finalFileSizeBytes'] = target.stat().st_size
    entry['responsiveVariants'] = []
    for variant_width in ((720, 1080) if variants else ()):
        if variant_width >= master.width:
            continue
        variant = master.resize((variant_width, round(master.height * variant_width / master.width)), Image.Resampling.LANCZOS)
        variant_path = target.with_stem(f'{target.stem}-{variant_width}')
        variant.save(variant_path, 'WEBP', quality=92, method=6, lossless=lossless, exact=True)
        entry['responsiveVariants'].append({'path':str(variant_path.relative_to(ROOT)), 'width':variant.width, 'height':variant.height, 'bytes':variant_path.stat().st_size})
    entry['format'] = 'webp'
    entry['status'] = 'optimized'
    entry['verification']['readabilityReview'] = False
    entry['verification']['lightAndDarkThemeReview'] = False
    entry['verification']['integrated'] = False
    if entry['finalFileSizeBytes'] > 250_000:
        print(f"Review size/readability tradeoff: {entry['filename']} is {entry['finalFileSizeBytes']:,} bytes")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, default=Path(__file__).with_name('inventory.json'))
    parser.add_argument('--captures', type=Path, help='Cloud screenshot directory outside the repository')
    parser.add_argument('--check', action='store_true', help='Validate inventory and existing optimized assets without writing')
    parser.add_argument('--lossless', action='store_true', help='Use lossless WebP when lossy compression makes UI text less readable')
    parser.add_argument('--no-variants', action='store_true', help='Let the Astro Image component generate responsive variants at build time')
    args = parser.parse_args()
    inventory = json.loads(args.inventory.read_text())
    validate(inventory)
    pending = [entry for entry in inventory['screenshots'] if entry['status'] == 'captured']
    if not args.check:
        if not args.captures:
            parser.error('--captures is required when optimizing')
        for entry in pending:
            if not entry['originalFile']:
                raise ValueError(f"Missing originalFile: {entry['id']}")
            optimize(entry, args.captures.resolve(), args.lossless, not args.no_variants)
        inventory['capturedScreenshotCount'] = sum(entry['captureSource'] == 'cloud-browser' for entry in inventory['screenshots'])
        inventory['integratedArticleCount'] = len({article['path'] for entry in inventory['screenshots'] if entry['verification']['integrated'] for article in entry['articles']})
        validate(inventory)
        args.inventory.write_text(json.dumps(inventory, indent=2) + '\n')
    complete = sum(entry['status'] in ('optimized', 'integrated') for entry in inventory['screenshots'])
    print(f"Inventory valid: {len(inventory['screenshots'])} entries, {complete} optimized/integrated. Pending screenshots are not verified captures.")


if __name__ == '__main__':
    main()
