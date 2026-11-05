"""Generate navy/gold PWA icons with the Python standard library only."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

NAVY = (11, 61, 92, 255)
GOLD = (196, 163, 90, 255)
PAPER = (247, 244, 238, 255)


def write_png(path: Path, width: int, height: int, rgba: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00" + rgba[y * stride : (y + 1) * stride]
    png = b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )
    path.write_bytes(png)


def filled_circle(px, size, cx, cy, r, colour):
    r2 = r * r
    for y in range(max(0, int(cy - r)), min(size, int(cy + r) + 1)):
        for x in range(max(0, int(cx - r)), min(size, int(cx + r) + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
                px[y * size + x] = colour


def filled_rect(px, size, x0, y0, x1, y1, colour):
    for y in range(max(0, y0), min(size, y1)):
        for x in range(max(0, x0), min(size, x1)):
            px[y * size + x] = colour


def make_icon(size: int) -> bytes:
    px = [NAVY] * (size * size)
    cx = cy = size / 2
    filled_circle(px, size, cx, cy, size * 0.42, GOLD)
    filled_circle(px, size, cx, cy, size * 0.36, NAVY)

    # Bell body
    filled_circle(px, size, cx, cy - size * 0.04, size * 0.16, GOLD)
    filled_rect(
        px,
        size,
        int(cx - size * 0.16),
        int(cy - size * 0.02),
        int(cx + size * 0.16),
        int(cy + size * 0.16),
        GOLD,
    )
    # Bell flare
    filled_rect(
        px,
        size,
        int(cx - size * 0.22),
        int(cy + size * 0.14),
        int(cx + size * 0.22),
        int(cy + size * 0.18),
        GOLD,
    )
    # Clapper
    filled_circle(px, size, cx, cy + size * 0.22, size * 0.045, PAPER)
    # Crown
    filled_rect(
        px,
        size,
        int(cx - size * 0.03),
        int(cy - size * 0.24),
        int(cx + size * 0.03),
        int(cy - size * 0.16),
        GOLD,
    )
    out = bytearray()
    for r, g, b, a in px:
        out.extend((r, g, b, a))
    return bytes(out)


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "icons"
    root.mkdir(exist_ok=True)
    for size in (192, 512):
        write_png(root / f"icon-{size}.png", size, size, make_icon(size))
    print("wrote", root)


if __name__ == "__main__":
    main()
