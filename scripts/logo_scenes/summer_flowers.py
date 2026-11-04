"""Summer flowers: the planning scene with an eryngium head greening to steel blue on the forecast line."""

from . import _heads
from .planning import loop, scene

LABEL = "Crop Material Planning, summer flowers"
ACCENT_COLOUR = "#3b6fb6"
SCENE_TRANSFORM = "translate(0 -70) translate(344 420) scale(1.1) translate(-344 -420)"
SCENE = scene(ACCENT_COLOUR, _heads.eryngium_head())
LOOP = loop(_heads.eryngium_tracks())
LOOP_MS = 5600
