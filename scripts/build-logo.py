"""Genera el logo de Natillera sin Fronteras (SVG + PNG) en assets/brand/.

Concepto (ruta B, «Anillos», elegida el 17/10): tres anillos entrelazados de
modo que ninguno se sostiene solo (anillos borromeos). Si se suelta uno, se
sueltan los tres: así funciona la natillera, el fondo existe porque todos ponen.
Cada color es un socio, en su país y su moneda.

Uso:  PYTHONUTF8=1 python scripts/build-logo.py
Requiere Pillow y Chrome o Edge (render headless, respeta clipPath y máscaras).
"""
from __future__ import annotations

import math
import pathlib
import shutil
import subprocess

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

# Paleta G (src/theme/colors.ts)
INDIGO = "#1A1B4B"
MENTA = "#A7C9B9"
VERDE = "#2F6F63"
FONDO = "#F5F6FA"
INDIGO2 = "#3F4C9A"
# Tercer anillo: lavanda derivada del índigo2, legible sobre el fondo índigo
LAVANDA = "#9AA6F0"


# Geometría de los anillos en la caja de 1024: centros en un triángulo de radio 111.
# El triángulo baja 28 px para que el contorno (no el centroide) quede centrado.
RING_R = 179
RING_W = 58
RING_GAP = 18  # aire a cada lado donde un anillo pasa por debajo de otro
_TRI = 111
_CY = 540
CENTERS = [(512 + _TRI * math.cos(math.radians(a)), _CY + _TRI * math.sin(math.radians(a)))
           for a in (-90, 150, 30)]
_uid = 0


def _crossings(i: int, j: int) -> tuple[tuple[float, float], tuple[float, float]]:
    """Los dos cruces de los anillos i y j: (el de afuera, el de adentro)."""
    (x1, y1), (x2, y2) = CENTERS[i], CENTERS[j]
    dx, dy = x2 - x1, y2 - y1
    dd = math.hypot(dx, dy)
    h = math.sqrt(RING_R ** 2 - (dd / 2) ** 2)
    mx, my = x1 + dx / 2, y1 + dy / 2
    pts = [(mx + h * dy / dd, my - h * dx / dd), (mx - h * dy / dd, my + h * dx / dd)]
    cx, cy = 512, _CY
    pts.sort(key=lambda q: -math.hypot(q[0] - cx, q[1] - cy))
    return pts[0], pts[1]


def _arc(ring: int, point: tuple[float, float], spread: float = 0.36) -> str:
    cx, cy = CENTERS[ring]
    a = math.atan2(point[1] - cy, point[0] - cx)

    def at(t: float) -> str:
        return f"{cx + RING_R * math.cos(t):.1f} {cy + RING_R * math.sin(t):.1f}"
    return f"M{at(a - spread)} A{RING_R} {RING_R} 0 0 1 {at(a + spread)}"


def symbol(colors: tuple[str, str, str] = (FONDO, MENTA, LAVANDA), weight: float = 1.0) -> str:
    """Los tres anillos, centrados ópticamente en una caja de 1024x1024.

    El entrelazado se hace con máscaras (no con trazos del color del fondo), así
    que funciona sobre degradados, fondos transparentes y en monocromo.
    `weight` engruesa el trazo para el favicon.
    """
    global _uid
    _uid += 1
    w = RING_W * weight
    # Por cada cruce, quién pasa por debajo y de qué anillo es el tramo que lo tapa.
    cuts: dict[int, list[tuple[int, tuple[float, float]]]] = {0: [], 1: [], 2: []}
    for i, j in ((0, 1), (1, 2), (2, 0)):
        outer, inner = _crossings(i, j)
        cuts[j].append((i, outer))  # afuera, i pasa por encima de j
        cuts[i].append((j, inner))  # adentro, j pasa por encima de i
    out = []
    for k, (cx, cy) in enumerate(CENTERS):
        mask_id = f"ring{_uid}_{k}"
        holes = "".join(
            f'<path d="{_arc(over, pt)}" fill="none" stroke="#000" stroke-width="{w + 2 * RING_GAP:.0f}"/>'
            for over, pt in cuts[k])
        out.append(
            f'<mask id="{mask_id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">'
            f'<rect width="1024" height="1024" fill="#fff"/>{holes}</mask>'
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{RING_R}" fill="none" stroke="{colors[k]}" '
            f'stroke-width="{w:.0f}" mask="url(#{mask_id})"/>')
    return "".join(out)


def svg(body: str, bg: str | None = None, radius: int = 0, size: int = 1024,
        scale: float = 1.0, glow: bool = False) -> str:
    """`glow` aclara el centro del fondo índigo para que el ícono no se pierda
    sobre fondos de pantalla oscuros."""
    back = ""
    if bg:
        fill = "url(#glow)" if glow else bg
        back = (f'<defs><radialGradient id="glow" cx="50%" cy="38%" r="70%">'
                f'<stop offset="0" stop-color="#2A2E6E"/><stop offset="1" stop-color="{bg}"/>'
                f'</radialGradient></defs>'
                f'<rect width="1024" height="1024" rx="{radius}" fill="{fill}"/>')
    off = 512 * (1 - scale)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 1024 1024">{back}'
            f'<g transform="translate({off} {off}) scale({scale})">{body}</g></svg>')


def write_svg(name: str, content: str) -> pathlib.Path:
    path = OUT / name
    path.write_text(content, encoding="utf-8")
    return path


def find_browser() -> str:
    for p in [shutil.which("chrome"), r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"]:
        if p and pathlib.Path(p).exists():
            return p
    raise SystemExit("Se necesita Chrome o Edge para renderizar")


BROWSER = find_browser()


def screenshot(src: pathlib.Path, png: pathlib.Path, width: int, height: int) -> None:
    subprocess.run([BROWSER, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--allow-file-access-from-files", "--force-device-scale-factor=1",
                    "--default-background-color=00000000", f"--screenshot={png}",
                    f"--window-size={width},{height}", src.as_uri()],
                   check=True, capture_output=True, timeout=60)


def render_png(svg_path: pathlib.Path, png_name: str, size: int) -> None:
    png = OUT / png_name
    screenshot(svg_path, png, 1024, 1024)
    if size != 1024:
        Image.open(png).resize((size, size), Image.LANCZOS).save(png)


# Android adaptive: la zona segura es un círculo de 626 px (66/108). El borde de
# afuera de los anillos llega a 335 px del centro; a 0.78 queda en 261, con margen.
ANDROID_SCALE = 0.78

variants = {
    # Logo con fondo redondeado (presentaciones, README, pitch)
    "logo.svg": (svg(symbol(), INDIGO, radius=232, scale=0.94, glow=True), [("logo.png", 1024)]),
    # Ícono de la app: cuadrado a sangre, iOS y Expo recortan las esquinas
    "icon.svg": (svg(symbol(), INDIGO, scale=1.04, glow=True), [("icon.png", 1024)]),
    # Favicon y tamaños chicos: trazo más grueso y símbolo más grande
    "favicon.svg": (svg(symbol(weight=1.3), INDIGO, scale=1.1, glow=True), [("favicon.png", 48)]),
    "android-foreground.svg": (svg(symbol(), scale=ANDROID_SCALE),
                               [("android-icon-foreground.png", 1024)]),
    "android-background.svg": (svg("", INDIGO, glow=True), [("android-icon-background.png", 1024)]),
    # Monocromo (temas de Android 13): los cruces quedan calados por las máscaras
    "android-monochrome.svg": (svg(symbol(colors=("#FFFFFF",) * 3), scale=ANDROID_SCALE),
                               [("android-icon-monochrome.png", 1024)]),
    # Splash: símbolo transparente sobre backgroundColor índigo
    "splash.svg": (svg(symbol(), scale=1.0), [("splash-icon.png", 1024)]),
    # Versión para fondos claros (#F5F6FA)
    "symbol-light.svg": (svg(symbol(colors=(INDIGO, VERDE, INDIGO2))), [("symbol-light.png", 512)]),
}

for name, (content, pngs) in variants.items():
    path = write_svg(name, content)
    for png_name, size in pngs:
        render_png(path, png_name, size)

# Wordmark horizontal con las tipografías de la app (render con Chrome headless)
FONTS = ROOT / "node_modules" / "@expo-google-fonts"
gloock = (FONTS / "gloock/400Regular/Gloock_400Regular.ttf").as_uri()
martian = (FONTS / "martian-mono/600SemiBold/MartianMono_600SemiBold.ttf").as_uri()
hanken = (FONTS / "hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf").as_uri()

# Mismo texto que SLOGAN en src/components/AnimatedSplash.tsx
SLOGAN = "Lejos en distancia, juntos en el ahorro."


def wordmark_html(bg: str, title: str, sub: str, sym: str, slogan: str = "",
                  height: int = 520) -> str:
    tagline = f"<h2>{slogan}</h2>" if slogan else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Gloock; src: url('{gloock}'); }}
@font-face {{ font-family: Martian; src: url('{martian}'); }}
@font-face {{ font-family: Hanken; src: url('{hanken}'); }}
html, body {{ margin: 0; background: {bg}; }}
.w {{ width: 1600px; height: {height}px; display: flex; align-items: center; gap: 44px;
     padding: 0 80px; box-sizing: border-box; }}
.w svg {{ width: 360px; height: 360px; flex: none; }}
h1 {{ font: 184px/0.95 Gloock, serif; color: {title}; margin: 0; letter-spacing: -2px; }}
p {{ font: 600 47px/1 Martian, monospace; color: {sub}; margin: 26px 0 0 6px;
     letter-spacing: 7px; }}
h2 {{ font: 500 54px/1.2 Hanken, sans-serif; color: {title}; opacity: .88; margin: 44px 0 0 6px; }}
</style></head><body><div class="w">{sym}<div><h1>Natillera</h1><p>SIN FRONTERAS</p>{tagline}</div>
</div></body></html>"""


# Con slogan: para el pitch, el README y las slides
for name, bg, title, sub, slogan, height in [
    ("wordmark-dark", INDIGO, FONDO, MENTA, "", 520),
    ("wordmark-light", FONDO, INDIGO, VERDE, "", 520),
    ("wordmark-slogan-dark", INDIGO, FONDO, MENTA, SLOGAN, 640),
    ("wordmark-slogan-light", FONDO, INDIGO, VERDE, SLOGAN, 640),
]:
    sym = svg(symbol(), INDIGO, radius=232, scale=0.94, glow=True)
    html = OUT / f"{name}.html"
    html.write_text(wordmark_html(bg, title, sub, sym, slogan, height), encoding="utf-8")
    screenshot(html, OUT / f"{name}.png", 1600, height)
    html.unlink()

print("Listo:", ", ".join(sorted(p.name for p in OUT.iterdir())))
