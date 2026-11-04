"""Planning: the Crop Material Planning mark.

Flat ink, no outlines, no bounces. Weekly stem-budget bars rise on a fine baseline, the forecast
line is drawn across them, and the actual lands on it as a single dot.
"""

from .common import ACCENT, HIDE, INK, MID, PALE, SHOW

LABEL = "Crop Material Planning"
SCENE_TRANSFORM = "translate(0 -70) translate(344 420) scale(1.1) translate(-344 -420)"
STAGE_ORIGIN = "view-box|344px 410px"

BASE_Y = 540
BAR_W = 56
BAR_X = (186, 265, 344, 423, 502)          # centres, one per week
BAR_H = (96, 138, 172, 158, 210)           # budgeted stems
# forecast: a revised line sitting just above the budget bars' tops
LINE = [(x, BASE_Y - h - 30) for x, h in zip(BAR_X, (80, 150, 150, 200, 235))]
ACTUAL = LINE[3]


def bar(i: int) -> str:
    fill = INK if i == 4 else (MID if i % 2 == 0 else PALE)
    return (f'<rect class="bar bar{i}" x="{BAR_X[i] - BAR_W // 2}" y="{BASE_Y - BAR_H[i]}" width="{BAR_W}" '
            f'height="{BAR_H[i]}" fill="{fill}"/>')


LINE_D = "M" + " L".join(f"{x} {y}" for x, y in LINE)

SCENE = f"""<g class="plan">
    <rect x="140" y="{BASE_Y}" width="408" height="6" fill="{INK}"/>
    {"".join(bar(i) for i in range(5))}
    <path class="fcast" d="{LINE_D}" fill="none" stroke="{ACCENT}" stroke-width="13"
          stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <g class="actual">
      <circle cx="{ACTUAL[0]}" cy="{ACTUAL[1]}" r="26" fill="#ffffff"/>
      <circle cx="{ACTUAL[0]}" cy="{ACTUAL[1]}" r="17" fill="{INK}"/>
    </g>
  </g>"""


def _rise(lo, hi):
    return [(0, {"transform": "scaleY(0)"}), (lo, {"transform": "scaleY(0)"}),
            (hi, {"transform": "scaleY(1)"}),
            (0.90, {"transform": "scaleY(1)"}), (0.91, {"transform": "scaleY(0)"}), (1, {"transform": "scaleY(0)"})]


LOOP = [
    (".plan", STAGE_ORIGIN, [
        (0, {"transform": "scale(.96)", "opacity": 0}),
        (0.04, SHOW), (0.88, SHOW), (0.95, HIDE), (1, {"transform": "scale(.86)", "opacity": 0}),
    ]),
] + [
    (f".bar{i}", f"view-box|{BAR_X[i]}px {BASE_Y}px", _rise(0.06 + 0.06 * i, 0.16 + 0.06 * i)) for i in range(5)
] + [
    (".fcast", None, [
        (0, {"strokeDashoffset": 1}), (0.42, {"strokeDashoffset": 1}), (0.62, {"strokeDashoffset": 0}),
        (0.90, {"strokeDashoffset": 0}), (0.91, {"strokeDashoffset": 1}), (1, {"strokeDashoffset": 1}),
    ]),
    (".actual", None, [
        (0, {"transform": "translateY(-70px)", "opacity": 0}), (0.66, {"transform": "translateY(-70px)", "opacity": 0}),
        (0.76, {"transform": "translateY(0px)", "opacity": 1}),
        (0.90, {"transform": "translateY(0px)", "opacity": 1}), (0.91, {"transform": "translateY(-70px)", "opacity": 0}),
        (1, {"transform": "translateY(-70px)", "opacity": 0}),
    ]),
]

LOOP_MS = 5600
