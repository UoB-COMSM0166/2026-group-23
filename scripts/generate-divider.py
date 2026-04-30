"""Generate the README cyberpunk divider strip.

Output: ArtAsset/ReadMe/divider.png (1920 x 40, transparent background)
Style: neon-violet -> cyan horizontal gradient, with a thin scanline + data-tick
texture and a soft outer glow. Run from repo root:

    python3 scripts/generate-divider.py
"""

from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Config — keep in sync with docs/visual-identity.md
# ---------------------------------------------------------------------------
WIDTH = 1920
HEIGHT = 40
VIOLET = (124, 58, 237)   # #7C3AED
CYAN = (6, 182, 212)      # #06B6D4
EMERALD = (16, 185, 129)  # #10B981 — used as a single accent tick
WHITE = (224, 231, 255)   # #E0E7FF
OUT_PATH = Path("ArtAsset/ReadMe/divider.png")


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    """Linear interpolation between two RGB tuples."""
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def main() -> None:
    # Transparent canvas
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1) Core line: a 2-px tall gradient strip centred vertically
    centre_y = HEIGHT // 2
    line_thickness = 2
    for x in range(WIDTH):
        t = x / (WIDTH - 1)
        # Smooth ease so the cyan side doesn't dominate
        eased = 0.5 - 0.5 * math.cos(t * math.pi)
        colour = lerp(VIOLET, CYAN, eased)
        draw.rectangle(
            [(x, centre_y - line_thickness // 2),
             (x, centre_y + line_thickness // 2 - 1)],
            fill=(*colour, 255),
        )

    # 2) Data-tick marks above and below the line at irregular intervals
    rng = random.Random(23)  # group-23 :)
    tick_count = 90
    for _ in range(tick_count):
        x = rng.randint(0, WIDTH - 1)
        t = x / (WIDTH - 1)
        colour = lerp(VIOLET, CYAN, t)
        # Random tick height (1-6 px) and side (above/below)
        h = rng.choice([1, 1, 2, 2, 3, 4, 6])
        if rng.random() < 0.5:
            y0, y1 = centre_y - 4 - h, centre_y - 4
        else:
            y0, y1 = centre_y + 4, centre_y + 4 + h
        # Brighten tick relative to the gradient
        bright = tuple(min(255, int(c * 1.3) + 30) for c in colour)
        draw.line([(x, y0), (x, y1)], fill=(*bright, 220), width=1)

    # 3) A single emerald accent tick (asymmetric pop, ~30% from left)
    accent_x = int(WIDTH * 0.31)
    draw.line(
        [(accent_x, centre_y - 10), (accent_x, centre_y + 10)],
        fill=(*EMERALD, 240),
        width=1,
    )
    draw.line(
        [(accent_x - 1, centre_y - 10), (accent_x - 1, centre_y + 10)],
        fill=(*EMERALD, 80),
        width=1,
    )

    # 4) Soft outer glow — composite a blurred copy of the colour layer behind
    glow = img.filter(ImageFilter.GaussianBlur(radius=4))
    # Reduce glow alpha so it stays subtle
    glow_alpha = glow.split()[3].point(lambda a: int(a * 0.55))
    glow.putalpha(glow_alpha)
    out = Image.alpha_composite(glow, img)

    # 5) Sparse "particle" dots (3-5 white dots scattered along the line)
    out_draw = ImageDraw.Draw(out)
    for _ in range(4):
        x = rng.randint(0, WIDTH - 1)
        out_draw.ellipse(
            [(x - 1, centre_y - 1), (x + 1, centre_y + 1)],
            fill=(*WHITE, 230),
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT_PATH, "PNG")
    print(f"Wrote {OUT_PATH} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
