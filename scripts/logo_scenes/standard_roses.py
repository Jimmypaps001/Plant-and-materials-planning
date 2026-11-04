"""Standard roses: the planning scene with a hybrid-tea rose opening on the end of the forecast line."""

from . import _heads
from .planning import loop, scene

LABEL = "Crop Material Planning, standard roses"
ACCENT_COLOUR = "#b8335a"
SCENE_TRANSFORM = "translate(0 -70) translate(344 420) scale(1.1) translate(-344 -420)"
SCENE = scene(ACCENT_COLOUR, _heads.standard_head())
LOOP = loop(_heads.standard_tracks())
LOOP_MS = 5600
