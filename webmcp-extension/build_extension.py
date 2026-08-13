#!/usr/bin/env python3
import argparse
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

# Chrome은 "_"로 시작하는 파일/폴더명(__pycache__ 등)을 거부합니다.
sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parent
MANIFEST_PATH = ROOT / 'manifest.json'
README_PATH = ROOT / 'README.md'
RELEASES_DIR = ROOT.parent / 'builds'
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
    match = VERSION_RE.match(current)
    if not match:
        raise ValueError(f"버전 형식이 올바르지 않습니다: {current}")
    major, minor, patch, build = match.groups()
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


def update_readme(current: str, next_version: str) -> None:
    text = README_PATH.read_text(encoding='utf-8')
    updated = re.sub(
        rf'Version:\s*{re.escape(current)}',
        f'Version: {next_version}',
        text,
        count=1,
    )
    if updated == text:
        raise ValueError('README에서 현재 버전 문자열을 찾지 못했습니다.')
    README_PATH.write_text(updated, encoding='utf-8')


def validate_pre_build() -> None:
    # Chrome은 "_" 접두 폴더를 거부하므로 먼저 제거합니다.
    for d in sorted(ROOT.rglob('__pycache__'), reverse=True):
        if d.is_dir():
            shutil.rmtree(d, ignore_errors=True)

    reserved = [
        str(p.relative_to(ROOT))
        for p in ROOT.rglob('*')
        if p.name.startswith('_')
    ]
    if reserved:
        raise ValueError(
            'Chrome은 "_"로 시작하는 파일/폴더를 로드할 수 없습니다: '
            + ', '.join(reserved)
        )

    required_files = [
        MANIFEST_PATH,
        README_PATH,
        ROOT / 'background.js',
        ROOT / 'content.js',
        ROOT / 'popup.html',
        ROOT / 'popup.js',
        ROOT / 'manifest.json',
    ]

    missing = [str(path.relative_to(ROOT)) for path in required_files if not path.exists()]
    if missing:
        raise FileNotFoundError(f'필수 파일 누락: {missing}')

    with MANIFEST_PATH.open('r', encoding='utf-8') as f:
        manifest = json.load(f)

    if manifest.get('manifest_version') != 3:
        raise ValueError('manifest_version은 3이어야 합니다.')
    if not manifest.get('name'):
        raise ValueError('manifest name이 비어 있습니다.')
    if not manifest.get('version'):
        raise ValueError('manifest version이 비어 있습니다.')

    if not (ROOT / 'popup.js').exists():
        raise FileNotFoundError('popup.js 파일이 없습니다.')

    result = subprocess.run(
        ['node', '--check', str(ROOT / 'popup.js')],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise ValueError(f'popup.js 문법 오류:\n{result.stderr}')

    html = (ROOT / 'popup.html').read_text(encoding='utf-8')
    if 'id="closeBtn"' not in html:
        raise ValueError('popup.html에 닫기 버튼(#closeBtn)이 없습니다.')

    text = README_PATH.read_text(encoding='utf-8')
    if 'Version:' not in text:
        raise ValueError('README에 버전 문구가 없습니다.')

    print('pre-build checks: OK')


def zip_extension(version: str) -> Path:
    RELEASES_DIR.mkdir(parents=True, exist_ok=True)
    archive_name = f'yonja-ai-assistant-webmcp-v{version}.zip'
    archive_path = RELEASES_DIR / archive_name

    with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(ROOT.iterdir()):
            if path.name == archive_path.name:
                continue
            if path.is_dir():
                for child in sorted(path.rglob('*')):
                    if child.is_file():
                        zf.write(child, child.relative_to(ROOT.parent))
            elif path.is_file():
                zf.write(path, path.relative_to(ROOT.parent))

    return archive_path


def main() -> int:
    parser = argparse.ArgumentParser(description='WebMCP 확장 프로그램 버전 증가 및 zip 패키징')
    parser.add_argument('--dry-run', action='store_true', help='버전만 미리 확인하고 실제 변경은 하지 않습니다.')
    parser.add_argument(
        '--version',
        metavar='X.Y.Z[.B]',
        help='지정한 버전으로 설정합니다 (예: 2.1.0). 미지정 시 자동으로 +1 증가합니다.',
    )
    args = parser.parse_args()

    try:
        validate_pre_build()
    except Exception as exc:
        print(f'빌드 전 체크 실패: {exc}')
        return 1

    current = read_version()

    if args.version:
        if not VERSION_RE.match(args.version):
            print(f'지원하지 않는 버전 형식입니다: {args.version!r}. 기대 형식: 0.1.1.3')
            return 1
        next_version = args.version
    else:
        next_version = bump_version(current)

    print(f'current: {current}')
    print(f'next:    {next_version}')

    if args.dry_run:
        return 0

    update_manifest(next_version)
    update_readme(current, next_version)
    archive_path = zip_extension(next_version)

    print(f'업데이트 완료: {current} -> {next_version}')
    print(f'패키지 생성: {archive_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
