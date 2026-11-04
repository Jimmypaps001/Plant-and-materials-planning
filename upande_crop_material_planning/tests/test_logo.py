"""The generated mark carries valid motion metadata (keyframes in order, selectors present)."""

import json
import re
import unittest
from pathlib import Path

IMAGES = Path(__file__).resolve().parents[1] / "public" / "images"


class TestLogo(unittest.TestCase):
    def _svg(self, name):
        return (IMAGES / name).read_text()

    def test_desk_svg_motion_metadata(self):
        svg = self._svg("crop_material_planning_logo.svg")
        m = re.search(r'<metadata id="crop-material-planning-motion">(.*?)</metadata>', svg, re.S)
        self.assertTrue(m, "motion metadata missing")
        spec = json.loads(m.group(1))
        self.assertGreater(spec["enterMs"], 0)
        self.assertGreater(spec["loopMs"], 0)
        for tracks in (spec["enter"], spec["loop"]):
            self.assertTrue(tracks)
            for t in tracks:
                offs = [f["offset"] for f in t["frames"]]
                self.assertTrue(all(0 <= o <= 1 for o in offs), t["sel"])
                self.assertEqual(offs, sorted(offs), t["sel"])
                # every animated selector exists in the artwork
                self.assertIn(t["sel"].lstrip(".").split(" ")[0], svg, t["sel"])

    def test_loader_is_pure_css(self):
        svg = self._svg("crop_material_planning_logo_loader.svg")
        self.assertIn("@keyframes", svg)
        self.assertNotIn("<metadata", svg)
