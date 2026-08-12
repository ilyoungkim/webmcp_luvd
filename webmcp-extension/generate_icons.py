#!/usr/bin/env python3
"""
크롬 확장 프로그램 아이콘 생성 스크립트
연애의자격 브랜드 보라색(#85176d) 아이콘 생성
"""
from PIL import Image, ImageDraw, ImageFont
import os

# 연애의자격 브랜드 색상
PRIMARY = (133, 23, 109)   # #85176d
ACCENT = (233, 27, 101)    # #e91b65
WHITE = (255, 255, 255)

OUT_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT_DIR, exist_ok=True)


def create_icon(size):
    """크기에 맞는 보라색 하트 아이콘 생성 (고품질)"""
    # 4배 해상도로 렌더링 후 축소해 부드럽게 (안티에일리어싱)
    ss = size * 4
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 배경: 그라데이션 원 (상단 PRIMARY -> 하단 ACCENT)
    for y in range(ss):
        ratio = y / ss
        r = int(PRIMARY[0] + (ACCENT[0] - PRIMARY[0]) * ratio)
        g = int(PRIMARY[1] + (ACCENT[1] - PRIMARY[1]) * ratio)
        b = int(PRIMARY[2] + (ACCENT[2] - PRIMARY[2]) * ratio)
        draw.line([(0, y), (ss, y)], fill=(r, g, b, 255))

    # 하트 그리기 (중앙, 좌표를 4배 해상도로)
    cx = ss / 2
    cy = ss / 2
    hr = ss * 0.32  # 하트 크기

    # 하트: 상단 두 개의 원 + 하단 삼각형
    draw.ellipse(
        [cx - hr * 2, cy - hr * 1.8, cx, cy + hr * 0.4],
        fill=WHITE + (255,)
    )
    draw.ellipse(
        [cx, cy - hr * 1.8, cx + hr * 2, cy + hr * 0.4],
        fill=WHITE + (255,)
    )
    # 하단 삼각형 (하트 꼬리)
    draw.polygon(
        [
            (cx - hr * 2.0, cy + hr * 0.3),
            (cx + hr * 2.0, cy + hr * 0.3),
            (cx, cy + hr * 2.4),
        ],
        fill=WHITE + (255,)
    )

    # 작은 해상도로 축소 (부드러운 안티에일리어싱)
    img = img.resize((size, size), Image.LANCZOS)
    return img


def main():
    sizes = [16, 48, 128]
    for size in sizes:
        icon = create_icon(size)
        path = os.path.join(OUT_DIR, f"icon{size}.png")
        icon.save(path)
        print(f"생성됨: {path} ({size}x{size})")


if __name__ == "__main__":
    main()
