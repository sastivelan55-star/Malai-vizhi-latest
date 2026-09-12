"""
generate_pwa_icons.py — Generates pixel-perfect PWA icon assets for MALAI VIZHI
Creates:
- pwa-192x192.png
- pwa-512x512.png
- pwa-maskable-512x512.png
- apple-touch-icon.png (180x180)
Using supersampled anti-aliased geometry matching Logo.tsx.
"""

import os
from PIL import Image, ImageDraw

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "frontend-react", "public")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def draw_icon(size: int, is_maskable: bool = False) -> Image.Image:
    # 4x Supersampling for ultra-crisp curves and antialiasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Base colors matching MALAI VIZHI design tokens
    bg_color = (7, 26, 43, 255)       # #071A2B deep command center slate
    mountain_dark = (11, 57, 72, 255) # #0B3948
    teal_primary = (20, 184, 166, 255) # #14B8A6
    teal_light = (45, 212, 191, 255)   # #2DD4BF
    snow_cap = (45, 212, 191, 200)     # semi-transparent teal

    # Fill background for maskable or standalone icon
    if is_maskable:
        # Full solid background filling entire canvas
        draw.rectangle([(0, 0), (canvas_size, canvas_size)], fill=bg_color)
        # Safe zone for maskable icons is central 80%
        offset_x = canvas_size * 0.1
        offset_y = canvas_size * 0.1
        content_size = canvas_size * 0.8
    else:
        # Rounded rectangle background container
        radius = int(canvas_size * 0.22)
        draw.rounded_rectangle(
            [(0, 0), (canvas_size - 1, canvas_size - 1)],
            radius=radius,
            fill=bg_color,
            outline=(20, 184, 166, 80),
            width=int(2 * scale)
        )
        offset_x = canvas_size * 0.08
        offset_y = canvas_size * 0.08
        content_size = canvas_size * 0.84

    # Normalized coordinate mapper from 48x48 base grid
    def tx(gx):
        return offset_x + (gx / 48.0) * content_size

    def ty(gy):
        return offset_y + (gy / 48.0) * content_size

    # 1. Outer subtle radar glow ring around the eye center
    cx, cy = tx(24), ty(30)
    outer_r = content_size * 0.42
    draw.ellipse(
        [(cx - outer_r, cy - outer_r), (cx + outer_r, cy + outer_r)],
        outline=(20, 184, 166, 35),
        width=int(1.5 * scale)
    )

    # 2. Mountain silhouette: [6, 36] -> [18, 14] -> [26, 24] -> [32, 16] -> [42, 36]
    mountain_pts = [
        (tx(6), ty(36)),
        (tx(18), ty(14)),
        (tx(26), ty(24)),
        (tx(32), ty(16)),
        (tx(42), ty(36)),
    ]
    draw.polygon(mountain_pts, fill=mountain_dark)
    # Outline of mountain
    draw.line(mountain_pts + [mountain_pts[0]], fill=teal_primary, width=int(1.8 * scale), joint="curve")

    # 3. Snow peaks
    peak1 = [(tx(18), ty(14)), (tx(22), ty(21)), (tx(14), ty(21))]
    draw.polygon(peak1, fill=snow_cap)

    peak2 = [(tx(32), ty(16)), (tx(36), ty(22)), (tx(28), ty(22))]
    draw.polygon(peak2, fill=(45, 212, 191, 160))

    # 4. Surveillance Radar / Sensor Eye
    # Eye outer ellipse: cx=24, cy=30, rx=11, ry=6.5
    rx = (11.0 / 48.0) * content_size
    ry = (6.5 / 48.0) * content_size
    # Back fill eye with dark to isolate from mountain
    draw.ellipse([(cx - rx, cy - ry), (cx + rx, cy + ry)], fill=(7, 26, 43, 230))
    draw.ellipse([(cx - rx, cy - ry), (cx + rx, cy + ry)], outline=teal_light, width=int(2.2 * scale))

    # Eye iris (r = 3.5)
    r_iris = (3.5 / 48.0) * content_size
    draw.ellipse([(cx - r_iris, cy - r_iris), (cx + r_iris, cy + r_iris)], fill=teal_primary)

    # Eye pupil (r = 1.5)
    r_pupil = (1.5 / 48.0) * content_size
    draw.ellipse([(cx - r_pupil, cy - r_pupil), (cx + r_pupil, cy + r_pupil)], fill=(7, 26, 43, 255))

    # Center pupil highlight dot
    r_highlight = (0.5 / 48.0) * content_size
    hx = cx - r_pupil * 0.3
    hy = cy - r_pupil * 0.3
    draw.ellipse([(hx - r_highlight, hy - r_highlight), (hx + r_highlight, hy + r_highlight)], fill=(255, 255, 255, 220))

    # Lateral telemetry scan lines
    draw.line([(tx(13), cy), (tx(8), cy)], fill=teal_primary, width=int(1.5 * scale))
    draw.line([(tx(35), cy), (tx(40), cy)], fill=teal_primary, width=int(1.5 * scale))

    # Downsample with high-quality Lanczos resampling
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    return img


def main():
    print("Generating MALAI VIZHI PWA icons...")

    # 1. 192x192 standard icon
    icon_192 = draw_icon(192, is_maskable=False)
    p192 = os.path.join(OUTPUT_DIR, "pwa-192x192.png")
    icon_192.save(p192, "PNG")
    print(f"✅ Generated: {p192}")

    # 2. 512x512 standard icon
    icon_512 = draw_icon(512, is_maskable=False)
    p512 = os.path.join(OUTPUT_DIR, "pwa-512x512.png")
    icon_512.save(p512, "PNG")
    print(f"✅ Generated: {p512}")

    # 3. 512x512 maskable icon (safe zone padding)
    icon_maskable = draw_icon(512, is_maskable=True)
    p_mask = os.path.join(OUTPUT_DIR, "pwa-maskable-512x512.png")
    icon_maskable.save(p_mask, "PNG")
    print(f"✅ Generated: {p_mask}")

    # 4. 180x180 Apple touch icon
    icon_apple = draw_icon(180, is_maskable=False)
    p_apple = os.path.join(OUTPUT_DIR, "apple-touch-icon.png")
    icon_apple.save(p_apple, "PNG")
    print(f"✅ Generated: {p_apple}")


if __name__ == "__main__":
    main()
