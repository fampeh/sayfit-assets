"""
Draws assets/og-cover.png - the 1200x630 image that Telegram, WhatsApp,
Instagram, LinkedIn and Google show when someone shares the site.

Why a script and not a design file: the cover has to be a raster PNG at
exactly 1200x630 (preview bots do not render SVG), and it has to stay in sync
with a very simple mark. Twelve lines of geometry are easier to keep honest in
code than in an exported bitmap nobody can edit later.

It has no dependencies - it writes the PNG bytes directly - so it runs on any
Python 3 without installing anything.

    python assets/make-og-cover.py

Replace the whole thing whenever you have artwork you prefer. The only
contract is: assets/og-cover.png, 1200x630. If you change the size, update the
og:image:width / og:image:height tags in index.html to match.
"""

import math
import struct
import zlib
from pathlib import Path

WIDTH, HEIGHT = 1200, 630
BACKGROUND = (255, 255, 255)
INK = (0, 0, 0)

OUTPUT = Path(__file__).resolve().parent / "og-cover.png"


class Canvas:
    """A plain RGB pixel buffer with antialiased line drawing."""

    def __init__(self, width, height, fill):
        self.width = width
        self.height = height
        self.pixels = bytearray(bytes(fill) * width * height)

    def blend(self, x, y, colour, alpha):
        if alpha <= 0 or not (0 <= x < self.width and 0 <= y < self.height):
            return
        alpha = min(alpha, 1.0)
        offset = (y * self.width + x) * 3
        for channel in range(3):
            existing = self.pixels[offset + channel]
            self.pixels[offset + channel] = int(
                existing + (colour[channel] - existing) * alpha
            )

    def line(self, x0, y0, x1, y1, colour, width=2.0):
        """
        Distance-field line: for every pixel in the segment's bounding box,
        work out how far it is from the segment and fade it in accordingly.
        Slower than Bresenham, but antialiased at any angle - which is the
        whole point of an image that is mostly thin diagonals.
        """
        dx, dy = x1 - x0, y1 - y0
        length_squared = dx * dx + dy * dy
        half = width / 2.0
        pad = int(math.ceil(half)) + 2

        for py in range(int(min(y0, y1)) - pad, int(max(y0, y1)) + pad):
            for px in range(int(min(x0, x1)) - pad, int(max(x0, x1)) + pad):
                if length_squared == 0:
                    distance = math.hypot(px - x0, py - y0)
                else:
                    t = ((px - x0) * dx + (py - y0) * dy) / length_squared
                    t = max(0.0, min(1.0, t))
                    distance = math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))

                # 1px of feathering at the edge of the stroke.
                self.blend(px, py, colour, half - distance + 0.5)

    def to_png(self, path):
        # One filter byte (0 = None) in front of every scanline.
        stride = self.width * 3
        raw = b"".join(
            b"\x00" + bytes(self.pixels[y * stride:(y + 1) * stride])
            for y in range(self.height)
        )

        def chunk(kind, payload):
            body = kind + payload
            return (
                struct.pack(">I", len(payload))
                + body
                + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
            )

        header = struct.pack(">IIBBBBB", self.width, self.height, 8, 2, 0, 0, 0)
        path.write_bytes(
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b"")
        )


def project(point, rot_x, rot_y, scale, centre, distance=6.0):
    """Rotate a unit-cube corner and project it, matching the site's cube."""
    x, y, z = point

    cos_y, sin_y = math.cos(rot_y), math.sin(rot_y)
    x, z = x * cos_y + z * sin_y, -x * sin_y + z * cos_y

    cos_x, sin_x = math.cos(rot_x), math.sin(rot_x)
    y, z = y * cos_x - z * sin_x, y * sin_x + z * cos_x

    perspective = distance / (distance - z)
    return (
        centre[0] + x * scale * perspective,
        centre[1] + y * scale * perspective,
    )


def main():
    canvas = Canvas(WIDTH, HEIGHT, BACKGROUND)

    corners = [
        (sx, sy, sz)
        for sx in (-1, 1)
        for sy in (-1, 1)
        for sz in (-1, 1)
    ]
    # Pairs of corners that differ in exactly one axis are an edge.
    edges = [
        (i, j)
        for i, a in enumerate(corners)
        for j, b in enumerate(corners)
        if i < j and sum(1 for k in range(3) if a[k] != b[k]) == 1
    ]

    # The same resting pose the cube takes on the landing page.
    rot_x = math.radians(-25)
    rot_y = math.radians(35)
    centre = (WIDTH / 2, HEIGHT / 2)
    points = [project(c, rot_x, rot_y, 150, centre) for c in corners]

    for i, j in edges:
        canvas.line(*points[i], *points[j], INK, width=2.0)

    canvas.to_png(OUTPUT)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes, {WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
