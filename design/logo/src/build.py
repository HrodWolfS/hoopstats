"""Génère tous les SVG du logo hoopstats (piste A — Pourcentage).

python3 design/logo/src/build.py  ->  design/logo/final/*.svg

Construction (toile 256, voir guide-usage.md) :
- barre oblique à 60°, épaisseur 28, coupée à l'horizontale entre y=28 et y=228 ;
- ballon : disque r=42 (léger dépassement optique sur le cercle) ;
- cercle : anneau elliptique 56×32 extérieur, 34×12 intérieur ;
- écart ballon/barre et cercle/barre ≈ 16-19 (vérifié ci-dessous).
"""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "final")
os.makedirs(OUT, exist_ok=True)

ORANGE = "#F97316"
INK = "#0A0A0B"
WHITE = "#FFFFFF"

ANGLE = math.radians(60)
DIR = (math.cos(ANGLE), -math.sin(ANGLE))  # sens de la barre (vers le haut à droite)
NORM = (math.sin(ANGLE), math.cos(ANGLE))  # normale à la barre


def ellipse(cx, cy, rx, ry):
    return (f"M{cx - rx:g} {cy:g} A{rx:g} {ry:g} 0 1 0 {cx + rx:g} {cy:g} "
            f"A{rx:g} {ry:g} 0 1 0 {cx - rx:g} {cy:g} Z")


def geometry(small=False, reversed_=False):
    """Retourne les trois formes (ballon, barre, cercle) en path d."""
    dx = -8  # centrage horizontal
    if small:
        # Version petite taille (≤ 32 px) : formes plus pleines, trou du cercle plus haut.
        w, ball, rim = 34, (72, 70, 46), (188, 196, 52, 32, 28, 13)
    else:
        w, ball, rim = 28, (74, 72, 42), (184, 194, 56, 32, 34, 12)
    if reversed_:
        # Sur fond sombre le blanc « gonfle » : on amincit d'environ 4 %.
        w -= 2
        rim = rim[:4] + (rim[4] + 2, rim[5] + 1)
    top, bottom = 28, 228
    half = w / 2 / math.sin(ANGLE)  # demi-largeur horizontale de la barre
    run = (bottom - top) / math.tan(ANGLE) / 2
    cx = 128 + dx
    slash = (f"M{cx - run - half:.2f} {bottom} L{cx - run + half:.2f} {bottom} "
             f"L{cx + run + half:.2f} {top} L{cx + run - half:.2f} {top} Z")
    bx, by, br = ball
    rx_, ry_, orx, ory, irx, iry = rim
    ball_d = ellipse(bx + dx, by, br, br)
    rim_d = ellipse(rx_ + dx, ry_, orx, ory) + " " + ellipse(rx_ + dx, ry_, irx, iry)

    # Contrôle des écarts (distance le long de la normale à la barre).
    def gap_circle(px, py, ext):
        d = abs((px + dx - cx) * NORM[0] + (py - 128) * NORM[1])
        return d - w / 2 - ext
    g_ball = gap_circle(bx, by, br)
    g_rim = gap_circle(rx_, ry_, math.hypot(orx * NORM[0], ory * NORM[1]))
    return ball_d, slash, rim_d, (round(g_ball, 1), round(g_rim, 1))


def symbol_body(ball_fill, ink_fill, small=False, reversed_=False):
    ball, slash, rim, _ = geometry(small, reversed_)
    return (f'<path fill="{ball_fill}" d="{ball}"/>'
            f'<path fill="{ink_fill}" d="{slash}"/>'
            f'<path fill="{ink_fill}" fill-rule="evenodd" d="{rim}"/>')


def svg(viewbox, body, title="hoopstats", bg=None):
    w, h = viewbox[2], viewbox[3]
    rect = f'<rect x="{viewbox[0]}" y="{viewbox[1]}" width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, viewbox))}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{rect}{body}</svg>\n')


WM = json.load(open(os.path.join(HERE, "wordmark-space-grotesk-600.json")))
# Hauteur d'x du mot = 88 unités : le symbole domine légèrement le mot.
WM_SCALE = 88 / WM["xheight"]
WM_W = WM["width"] * WM_SCALE


def wordmark(x, baseline, fill):
    return (f'<path fill="{fill}" transform="translate({x:.2f} {baseline}) scale({WM_SCALE:.5f})" '
            f'd="{WM["d"]}"/>')


def write(name, content):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(content)


VARIANTS = {
    # nom: (couleur ballon, couleur encre, inversé)
    "couleur": (ORANGE, INK, False),
    "couleur-fond-sombre": (ORANGE, WHITE, True),
    "noir": (INK, INK, False),
    "blanc": (WHITE, WHITE, True),
}

for name, (ball_c, ink_c, rev) in VARIANTS.items():
    # Symbole seul (marges 20 de part et d'autre).
    write(f"symbole-{name}.svg", svg((0, 0, 256, 256), symbol_body(ball_c, ink_c, reversed_=rev)))
    write(f"symbole-petit-{name}.svg",
          svg((0, 0, 256, 256), symbol_body(ball_c, ink_c, small=True, reversed_=rev)))

    # Horizontal : symbole (16→240), espace = 48, mot ; ligne de base = bas du symbole (228).
    gap = 48
    text_x = 240 + gap
    width = int(text_x + WM_W + 16)
    body = symbol_body(ball_c, ink_c, reversed_=rev) + wordmark(text_x, 228, ink_c)
    write(f"horizontal-{name}.svg", svg((0, 0, width, 284), body))

    # Empilé : symbole agrandi ×1,5 centré au-dessus, mot centré dessous
    # (décalage de 3 unités : approches du « h » et du « s » inégales, centrage optique).
    k = 1.5
    sw = int(WM_W + 64)
    sx = (sw - 256 * k) / 2
    baseline = int(228 * k + 44 + 700 * WM_SCALE)  # 44 d'air sous le cercle jusqu'au haut du « h »
    body = (f'<g transform="translate({sx:.2f} 0) scale({k})">{symbol_body(ball_c, ink_c, reversed_=rev)}</g>'
            + wordmark((sw - WM_W) / 2 - 3, baseline, ink_c))
    sh = baseline + 64
    write(f"empile-{name}.svg", svg((0, 0, sw, sh), body))

    # Mot seul.
    write(f"mot-{name}.svg", svg((0, 0, int(WM_W + 32), 200), wordmark(16, 150, ink_c)))

# Tuiles sur fond encre (version petite taille inversée) : lisibles sur onglet clair comme sombre.
def tile(name, rx, scale):
    write(name, svg((0, 0, 256, 256),
                    f'<rect width="256" height="256" rx="{rx}" fill="{INK}"/>'
                    f'<g transform="translate(128 128) scale({scale}) translate(-128 -128)">'
                    f'{symbol_body(ORANGE, WHITE, small=True, reversed_=True)}</g>'))


tile("icone-appli.svg", 56, 0.72)
tile("favicon.svg", 48, 0.86)
tile("icone-masquable.svg", 0, 0.6)  # Android recadre en cercle : zone sûre de 80 %

for small in (False, True):
    for rev in (False, True):
        print("écarts", "petit" if small else "normal", "inversé" if rev else "", geometry(small, rev)[3])
print("largeur du mot", round(WM_W, 1))
