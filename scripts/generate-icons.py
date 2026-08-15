"""
Genera el set de íconos de Pulso a partir de assets/icon-master.png

    python3 scripts/generate-icons.py

Produce en public/:
  apple-touch-icon.png  180x180  iPhone / iPad (sin redondear: iOS aplica su máscara)
  icon-192.png          192x192  Android / PWA
  icon-512.png          512x512  Android / splash
  favicon-32.png         32x32   pestaña del navegador
  og-image.png         1200x630  vista previa al compartir el enlace

Para cambiar el ícono, reemplaza assets/icon-master.png por una imagen
cuadrada (idealmente 1024x1024) y vuelve a correr el script.
"""

import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, "..")
MASTER = os.path.join(ROOT, "assets", "icon-master.png")
OUT = os.path.join(ROOT, "public")

INK = (18, 18, 22)
CREAM = (250, 249, 246)


def load_master() -> Image.Image:
    if not os.path.exists(MASTER):
        raise SystemExit(f"Falta {MASTER}")
    return Image.open(MASTER).convert("RGB")


def square(master: Image.Image, size: int, rounded: bool = False,
           radius_ratio: float = 0.22) -> Image.Image:
    """Versión cuadrada del ícono. rounded=False para iOS, que aplica
    su propia máscara y se ve mal si la imagen ya viene redondeada."""
    ss = 2
    img = master.resize((size * ss, size * ss), Image.LANCZOS)

    if rounded:
        out = Image.new("RGBA", img.size, (0, 0, 0, 0))
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, img.size[0] - 1, img.size[1] - 1],
            radius=int(img.size[0] * radius_ratio), fill=255,
        )
        out.paste(img, (0, 0), mask)
        img = out

    return img.resize((size, size), Image.LANCZOS)


def wordmark(d: ImageDraw.ImageDraw, cx: float, cy: float, width: float):
    """PULSO con trazos rectos, para no depender de tipografías externas."""
    n = 5
    gap = width * 0.07
    cw = (width - gap * (n - 1)) / n
    ch = cw * 1.6
    t = max(2, int(cw * 0.18))
    x, y = cx - width / 2, cy - ch / 2
    R = lambda a, b, c2, d2: d.rectangle([a, b, c2, d2], fill=CREAM)

    def P(x, y):
        R(x, y, x + t, y + ch); R(x, y, x + cw, y + t)
        R(x + cw - t, y, x + cw, y + ch * 0.55)
        R(x, y + ch * 0.55 - t, x + cw, y + ch * 0.55)

    def U(x, y):
        R(x, y, x + t, y + ch); R(x + cw - t, y, x + cw, y + ch)
        R(x, y + ch - t, x + cw, y + ch)

    def L(x, y):
        R(x, y, x + t, y + ch); R(x, y + ch - t, x + cw, y + ch)

    def S(x, y):
        R(x, y, x + cw, y + t); R(x, y, x + t, y + ch * 0.55)
        R(x, y + ch * 0.5 - t / 2, x + cw, y + ch * 0.5 + t / 2)
        R(x + cw - t, y + ch * 0.5, x + cw, y + ch)
        R(x, y + ch - t, x + cw, y + ch)

    def O(x, y):
        R(x, y, x + t, y + ch); R(x + cw - t, y, x + cw, y + ch)
        R(x, y, x + cw, y + t); R(x, y + ch - t, x + cw, y + ch)

    for i, fn in enumerate((P, U, L, S, O)):
        fn(x + i * (cw + gap), y)


def og_image(master: Image.Image, width: int = 1200, height: int = 630) -> Image.Image:
    ss = 2
    W, H = width * ss, height * ss
    canvas = Image.new("RGB", (W, H), INK)

    glyph = int(H * 0.46)
    icon = square(master, glyph, rounded=True, radius_ratio=0.24)
    canvas.paste(icon, ((W - glyph) // 2, int(H * 0.15)), icon)

    wordmark(ImageDraw.Draw(canvas), W / 2, H * 0.82, W * 0.26)
    return canvas.resize((width, height), Image.LANCZOS)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m = load_master()

    jobs = [
        ("apple-touch-icon.png", square(m, 180, rounded=False)),
        ("icon-192.png",         square(m, 192, rounded=True)),
        ("icon-512.png",         square(m, 512, rounded=True)),
        ("favicon-32.png",       square(m, 32,  rounded=True, radius_ratio=0.18)),
        ("og-image.png",         og_image(m)),
    ]

    for name, img in jobs:
        path = os.path.join(OUT, name)
        img.save(path, "PNG", optimize=True)
        print(f"  {name:24} {os.path.getsize(path) // 1024} KB")

    print("\nÍconos generados en public/")
