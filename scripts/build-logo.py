"""Genera el logo de Natillera sin Fronteras (SVG + PNG) en assets/brand/.

Concepto: la paila donde se cocina la natilla es media esfera del mundo
(meridianos y paralelos sin fronteras) y recibe una moneda con un brote:
el ahorro de la familia que crece, venga de donde venga.

Uso:  PYTHONUTF8=1 python scripts/build-logo.py
Requiere Pillow y Chrome o Edge (render headless, respeta clipPath y máscaras).
"""
from __future__ import annotations

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


def symbol(coin: str = FONDO, rim: str = FONDO, bowl: str = MENTA, lines: str = VERDE,
           sprout: str = VERDE, ring: str = MENTA) -> str:
    """Símbolo en una caja de 1024x1024, centrado ópticamente."""
    return f"""
  <g transform="translate(0 24)">
    <defs>
      <clipPath id="bowl"><path d="M240 480 A272 290 0 0 0 784 480 Z"/></clipPath>
    </defs>
    <!-- moneda con brote: el ahorro que crece -->
    <circle cx="512" cy="318" r="114" fill="{coin}"/>
    <circle cx="512" cy="318" r="84" fill="none" stroke="{ring}" stroke-width="11"/>
    <g transform="translate(512 322) scale(1.22) translate(-512 -292)">
      <path d="M512 336 V292" stroke="{sprout}" stroke-width="12" stroke-linecap="round"/>
      <path d="M512 312 C474 310 458 286 462 256 C494 258 512 280 512 312 Z" fill="{sprout}"/>
      <path d="M512 296 C540 290 558 270 558 244 C532 244 512 262 512 296 Z" fill="{sprout}"/>
    </g>
    <!-- paila = media esfera del mundo -->
    <path d="M240 480 A272 290 0 0 0 784 480 Z" fill="{bowl}"/>
    <g clip-path="url(#bowl)" fill="none" stroke="{lines}" stroke-width="13" stroke-linecap="round">
      <ellipse cx="512" cy="480" rx="178" ry="290"/>
      <ellipse cx="512" cy="480" rx="84" ry="290"/>
      <path d="M512 480 V780"/>
      <path d="M200 586 H824"/>
      <path d="M200 680 H824"/>
    </g>
    <!-- borde y asas -->
    <rect x="148" y="458" width="728" height="30" rx="15" fill="{rim}"/>
    <rect x="200" y="442" width="624" height="58" rx="29" fill="{rim}"/>
  </g>"""


def svg(body: str, bg: str | None = None, radius: int = 0, size: int = 1024,
        scale: float = 1.0) -> str:
    back = ""
    if bg:
        back = f'<rect width="1024" height="1024" rx="{radius}" fill="{bg}"/>'
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


variants = {
    # Logo con fondo redondeado (presentaciones, README, pitch)
    "logo.svg": (svg(symbol(), INDIGO, radius=232), [("logo.png", 1024)]),
    # Ícono de la app: cuadrado a sangre, iOS y Expo recortan las esquinas
    "icon.svg": (svg(symbol(), INDIGO, scale=0.94), [("icon.png", 1024), ("favicon.png", 48)]),
    # Android adaptive: primer plano en la zona segura (66 %) y fondo plano
    "android-foreground.svg": (svg(symbol(), scale=0.62), [("android-icon-foreground.png", 1024)]),
    "android-background.svg": (svg("", INDIGO), [("android-icon-background.png", 1024)]),
    # Splash: símbolo transparente sobre backgroundColor índigo
    "splash.svg": (svg(symbol(), scale=1.0), [("splash-icon.png", 1024)]),
    # Versión clara para fondos blancos (#F5F6FA): moneda índigo, paila verde
    "symbol-light.svg": (
        svg(symbol(coin=INDIGO, rim=INDIGO, bowl=MENTA, lines=VERDE, sprout=MENTA, ring="#3F4C9A")),
        [("symbol-light.png", 512)],
    ),
}

for name, (content, pngs) in variants.items():
    path = write_svg(name, content)
    for png_name, size in pngs:
        render_png(path, png_name, size)

# Monocromo (temas de Android 13): silueta con máscara, las líneas del mundo quedan caladas
mono_svg = svg(f"""
  <defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
    <rect width="1024" height="1024" fill="#000"/>{symbol(coin="#fff", rim="#fff", bowl="#fff",
    lines="#000", sprout="#000", ring="#000")}</mask></defs>
  <rect width="1024" height="1024" fill="#fff" mask="url(#m)"/>""", scale=0.62)
render_png(write_svg("android-monochrome.svg", mono_svg), "android-icon-monochrome.png", 1024)

# Wordmark horizontal con las tipografías de la app (render con Chrome headless)
FONTS = ROOT / "node_modules" / "@expo-google-fonts"
gloock = (FONTS / "gloock/400Regular/Gloock_400Regular.ttf").as_uri()
martian = (FONTS / "martian-mono/600SemiBold/MartianMono_600SemiBold.ttf").as_uri()


def wordmark_html(bg: str, title: str, sub: str, sym: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Gloock; src: url('{gloock}'); }}
@font-face {{ font-family: Martian; src: url('{martian}'); }}
html, body {{ margin: 0; background: {bg}; }}
.w {{ width: 1600px; height: 520px; display: flex; align-items: center; gap: 44px;
     padding: 0 80px; box-sizing: border-box; }}
.w svg {{ width: 360px; height: 360px; flex: none; }}
h1 {{ font: 184px/0.95 Gloock, serif; color: {title}; margin: 0; letter-spacing: -2px; }}
p {{ font: 600 47px/1 Martian, monospace; color: {sub}; margin: 26px 0 0 6px;
     letter-spacing: 7px; }}
</style></head><body><div class="w">{sym}<div><h1>Natillera</h1><p>SIN FRONTERAS</p></div>
</div></body></html>"""


for name, bg, title, sub, sym in [
    ("wordmark-dark", INDIGO, FONDO, MENTA, svg(symbol(), INDIGO, radius=232)),
    ("wordmark-light", FONDO, INDIGO, VERDE, svg(symbol(), INDIGO, radius=232)),
]:
    html = OUT / f"{name}.html"
    html.write_text(wordmark_html(bg, title, sub, sym), encoding="utf-8")
    screenshot(html, OUT / f"{name}.png", 1600, 520)
    html.unlink()

print("Listo:", ", ".join(sorted(p.name for p in OUT.iterdir())))
