"""Spray roses: the planning scene with a spray of rosettes and buds opening on the forecast line's end."""

from . import _heads
from .planning import loop, scene

LABEL = "Crop Material Planning, spray roses"
ACCENT_COLOUR = "#d46a8c"
SCENE_TRANSFORM = "translate(0 -70) translate(344 420) scale(1.1) translate(-344 -420)"
SCENE = scene(ACCENT_COLOUR, _heads.spray_head())
LOOP = loop(_heads.spray_tracks())
LOOP_MS = 5600
