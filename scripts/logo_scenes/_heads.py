"""Flower heads for the per-crop planning marks, copied from upande_production's cut-flower scenes
(_cut_flowers.py, standard_roses.py, spray_roses.py, summer_flowers.py): a hybrid-tea rose, a spray of
small rosettes and buds, and an eryngium head. Each stands with its base at 0,0 and a `track_*` list
animates it in the scene's loop (offsets are fractions of the loop).

Not a scene (the build skips modules starting with an underscore).
"""

import math

from ._cut_flowers import GONE, LOCAL, SHOW, bud, rose_bloom, seq
from .planning import LINE_END

# -- shared ------------------------------------------------------------------------

FLAT = {"transform": "scale(.3)", "opacity": 0}


def at_line_end(markup: str, scale: float) -> str:
    """Stand a head on the end of the forecast line."""
    x, y = LINE_END
    return f'<g transform="translate({x} {y}) scale({scale})">{markup}</g>'


def pop_in(sel, lo, hi):
    return (sel, LOCAL, seq(GONE, (lo, GONE), (hi, SHOW)))


def _open(sel, origin, frm, to, lo, hi, prop="rotate"):
    fmt = (lambda v: f"rotate({v}deg)") if prop == "rotate" else (lambda v: f"scale({v})")
    return (sel, origin, seq({"transform": fmt(frm)}, (lo, {"transform": fmt(frm)}), (hi, {"transform": fmt(to)})))


def rose_tracks(cls, lo, hi):
    """Open one rose_bloom(cls): bud swells and the outer and front petals unfold between lo and hi."""
    d = hi - lo
    return [
        _open(f".{cls}-bud", "view-box|0px -8px", ".6", "1", lo, lo + d * .6, "scale"),
        _open(f".{cls}-pl", "view-box|-8px -30px", 44, 0, lo, hi),
        _open(f".{cls}-pr", "view-box|8px -30px", -44, 0, lo, hi),
        _open(f".{cls}-fl", "view-box|0px -4px", ".82", "1", lo + d * .1, hi, "scale"),
        _open(f".{cls}-fr", "view-box|0px -4px", ".82", "1", lo + d * .2, hi, "scale"),
    ]


# -- standard roses: one high-centred bloom ---------------------------------------------

STD_TONES = ("#7d1f3d", "#a82a52", "#c94468", "#dd6a88")


def standard_head():
    return at_line_end(f'<g class="fw">{rose_bloom(STD_TONES, 1.0, "mb")}</g>', .72)


def standard_tracks():
    return [pop_in(".fw", 0.70, 0.76)] + rose_tracks("mb", 0.74, 0.86)


# -- spray roses: three rosettes and two buds on short peduncles --------------------------

SPRAY_TONES = ("#a8456b", "#c9577e", "#df7d9b", "#ee9fb6")
SPRAY = [("x1", (0, -36), .3), ("x2", (-34, -10), .24), ("x3", (34, -16), .24)]
BUDS = [("b1", (-14, -52), .45), ("b2", (16, -50), .4)]


def spray_head():
    from ._cut_flowers import LEAF
    ped = "".join(f'<path d="M0 0 Q{x * .3:.0f} {y * .6:.0f} {x} {y}" fill="none" stroke="{LEAF}" stroke-width="5" stroke-linecap="round"/>'
                  for _, (x, y), _s in SPRAY + BUDS)
    roses = "".join(f'<g transform="translate({x} {y})"><g class="sp-{n}">{rose_bloom(SPRAY_TONES, s, n)}</g></g>' for n, (x, y), s in SPRAY)
    buds = "".join(f'<g transform="translate({x} {y})"><g class="sp-{n}">{bud(SPRAY_TONES, s)}</g></g>' for n, (x, y), s in BUDS)
    return at_line_end(f'<g class="fw">{ped}{buds}{roses}</g>', 1.25)


def spray_tracks():
    out = [pop_in(".fw", 0.70, 0.74)]
    for i, (n, _p, _s) in enumerate(SPRAY):
        out.append(pop_in(f".sp-{n}", 0.72 + .02 * i, 0.76 + .02 * i))
        out += rose_tracks(n, 0.76 + .02 * i, 0.86 + .01 * i)
    for i, (n, _p, _s) in enumerate(BUDS):
        out.append(pop_in(f".sp-{n}", 0.72 + .02 * i, 0.78 + .02 * i))
    return out


# -- summer flowers: an eryngium head greening to steel blue ----------------------------

STEM = "#4f7c93"
YOUNG = {"dome": "#8fae9a", "a": "#86aa78", "b": "#a8c4a0"}
BLUE = {"dome": "#2f568f", "a": "#3b6fb6", "b": "#6b97d1"}
FLORET = "#a9c4e6"


def bract(length, fill, cls="", rot=0):
    L = length
    pts = [(-5.5, 0), (-3.4, -.3 * L), (-8.5, -.36 * L), (-3, -.56 * L), (-7, -.64 * L), (-1.8, -.84 * L), (0, -L),
           (1.8, -.84 * L), (7, -.64 * L), (3, -.56 * L), (8.5, -.36 * L), (3.4, -.3 * L), (5.5, 0)]
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"
    return f'<path class="{cls}" transform="rotate({rot})" d="{d}" fill="{fill}"/>'


def eryngium_head():
    angles = [-168, -148, -128, -108, -88, -68, -48, -28, -8, 12, 172]
    ruff = "".join(bract(66 - 5 * (i % 3), YOUNG["a"] if i % 2 else YOUNG["b"], "br-a" if i % 2 else "br-b", a + 90)
                   for i, a in enumerate(angles))
    dots = ""
    for row, y in enumerate((-10, -22, -34, -46, -57)):
        half = 20 * math.sqrt(max(0.0, 1 - ((y + 33) / 36) ** 2))
        n = max(1, int(half * 2 // 9))
        for k in range(n + 1):
            x = -half + (k + (row % 2) * .5) * (2 * half / max(n, 1))
            if abs(x) <= half:
                dots += f'<circle cx="{x:.1f}" cy="{y}" r="2.5" fill="{FLORET}" fill-opacity=".75"/>'
    dome = (f'<path class="dm" d="M-24 -2 C-28 -34 -12 -62 0 -69 C12 -62 28 -34 24 -2 C12 6 -12 6 -24 -2 Z" '
            f'fill="{YOUNG["dome"]}"/>{dots}')
    collar = "".join(bract(36, YOUNG["a"] if i % 2 else YOUNG["b"], "br-a" if i % 2 else "br-b", a)
                     for i, a in enumerate((-62, -34, -10, 14, 38, 62)))
    return at_line_end(f'<g class="fw"><g class="ru">{ruff}</g>{dome}<g class="ru">{collar}</g></g>', .85)


def eryngium_tracks():
    def fill(sel, a, b, lo, hi):
        return (sel, None, seq({"fill": a}, (lo, {"fill": a}), (hi, {"fill": b})))
    return [
        pop_in(".fw", 0.70, 0.76),
        (".ru", LOCAL, seq({"transform": "scale(.25)"}, (0.72, {"transform": "scale(.25)"}), (0.84, {"transform": "scale(1)"}))),
        fill(".dm", YOUNG["dome"], BLUE["dome"], 0.78, 0.88),
        fill(".br-a", YOUNG["a"], BLUE["a"], 0.78, 0.88),
        fill(".br-b", YOUNG["b"], BLUE["b"], 0.79, 0.89),
    ]
