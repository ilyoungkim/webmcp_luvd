#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST_PATH = ROOT / 'manifest.json'
README_PATH = ROOT / 'README.md'

VERSION_RE = re.compile(r'^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$')


def read_version() -> str:
    with MANIFEST_PATH.open('r', encoding='utf-8') as f:
        manifest = json.load(f)
    version = manifest.get('version')
    if not version or not VERSION_RE.match(version):
        raise ValueError(
            f"지원하지 않는 버전 형식입니다: {version!r}. 기대 형식: 0.1.1.3"
        )
    return version


def bump_version(current: str) -> str:
    m = VERSION_RE.match(current)
    if not m:
        raise ValueError(f"버전 형식이 올바르지 않습니다: {current}")
    major, minor, patch, build = m.groups()
    if build is None:
        build = '0'
    next_build = int(build) + 1
    return f"{major}.{minor}.{patch}.{next_build}"


def update_manifest(version: str) -> None:
    with MANIFEST_PATH.open('r', encoding='utf-8') as f:
        manifest = json.load(f)
    manifest['version'] = version
    with MANIFEST_PATH.open('w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write('\n')


def update_readme(current: str, new: str) -> None:
    if not README_PATH.exists():
        return
    text = README_PATH.read_text(encoding='utf-8')
    updated = re.sub(
        rf'Version:\s*{re.escape(current)}',
        f'Version: {new}',
        text,
        count=1,
    )
    if updated == text:
        raise ValueError('README에서 현재 버전 문자열을 찾지 못했습니다.')
    README_PATH.write_text(updated, encoding='utf-8')


def main() -> int:
    dry_run = '--dry-run' in sys.argv[1:]
    current = read_version()
    next_version = bump_version(current)

    print(f'current: {current}')
    print(f'next:    {next_version}')

    if dry_run:
        return 0

    update_manifest(next_version)
    update_readme(current, next_version)
    print(f'업데이트 완료: {current} -> {next_version}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
