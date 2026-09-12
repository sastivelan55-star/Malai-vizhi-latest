"""
generate_android_icons.py — Generates authentic MALAI VIZHI app icons for Android mipmap densities
"""

import os
from PIL import Image
from generate_pwa_icons import draw_icon

RES_DIR = os.path.join(os.path.dirname(__file__), "frontend-react", "android", "app", "src", "main", "res")

MIPMAP_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

def main():
    print("Generating Android mipmap launcher icons...")
    for folder, size in MIPMAP_SIZES.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Standard icon
        icon = draw_icon(size, is_maskable=False)
        p_std = os.path.join(folder_path, "ic_launcher.png")
        icon.save(p_std, "PNG")

        # Round icon (maskable)
        round_icon = draw_icon(size, is_maskable=True)
        p_round = os.path.join(folder_path, "ic_launcher_round.png")
        round_icon.save(p_round, "PNG")

        print(f"✅ {folder} ({size}x{size}): ic_launcher.png & ic_launcher_round.png")

if __name__ == "__main__":
    main()
