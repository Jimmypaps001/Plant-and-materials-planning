"""The generated marks are pure-CSS: the desk tile plays once and rests, the loader loops."""

import re
import unittest
from pathlib import Path

IMAGES = Path(__file__).resolve().parents[1] / "public" / "images"


def _animations(svg):
    return re.findall(r"animation: ([\w-]+) (\d+)ms [^;]*? (infinite|\d+) both;", svg)


CROPS = ("standard-roses", "spray-roses", "summer-flowers")


class TestLogo(unittest.TestCase):
    def test_desk_svg_plays_once_and_rests(self):
        svg = (IMAGES / "crop_material_planning_logo.svg").read_text()
        anims = _animations(svg)
        self.assertTrue(anims)
        self.assertTrue(all(a[2] == "1" for a in anims), "desk tile must play once")
        self.assertNotIn("infinite", svg)
        self.assertNotIn("<metadata", svg)
        self.assertNotIn("<script", svg)
        self.assertIn("prefers-reduced-motion: reduce", svg)
        # arrow and scene exist, and the scene starts hidden so the end state is the plain mark
        self.assertIn('class="arrow"', svg)
        self.assertIn('class="scene"', svg)

    def test_keyframes_ordered_and_end_at_rest(self):
        svg = (IMAGES / "crop_material_planning_logo.svg").read_text()
        blocks = re.findall(r"@keyframes ([\w-]+) \{(.*?)\n    \}", svg, re.S)
        self.assertTrue(blocks)
        for name, body in blocks:
            pcts = [float(x) for x in re.findall(r"([\d.]+)% \{", body)]
            self.assertEqual(pcts, sorted(pcts), name)
            self.assertEqual((pcts[0], pcts[-1]), (0.0, 100.0), name)
            steps = re.findall(r"([\d.]+)% \{ ([^}]*)\}", body)
            first, last = steps[0][1], steps[-1][1]
            self.assertEqual(first, last, f"{name} must end where it began (rest)")

    def test_loader_loops(self):
        svg = (IMAGES / "crop_material_planning_logo_loader.svg").read_text()
        self.assertIn("infinite", svg)
        self.assertNotIn("<metadata", svg)

    def test_every_crop_has_a_play_once_mark_and_a_looping_loader(self):
        for key in CROPS:
            desk = (IMAGES / f"crop_material_planning_logo_{key}.svg").read_text()
            loader = (IMAGES / f"crop_material_planning_logo_{key}_loader.svg").read_text()
            self.assertNotIn("infinite", desk, key)
            self.assertIn("animation:", desk, key)
            self.assertIn("infinite", loader, key)
            self.assertIn('class="fw"', desk, key)  # the crop's flower head
            self.assertIn("prefers-reduced-motion", desk, key)
            for svg in (desk, loader):
                for name, body in re.findall(r"@keyframes ([\w-]+) \{(.*?)\n    \}", svg, re.S):
                    pcts = [float(x) for x in re.findall(r"([\d.]+)% \{", body)]
                    self.assertEqual(pcts, sorted(pcts), f"{key} {name}")
