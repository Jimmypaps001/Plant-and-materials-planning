"""The React app's shell: built bundle present, workspace holds only the navigation block, tiles stay in-tab."""

import json
import re
import unittest
from pathlib import Path

PKG = Path(__file__).resolve().parents[1]


class TestFrontendShell(unittest.TestCase):
    def test_built_bundle_and_manifest(self):
        manifest = PKG / "public" / "dist" / ".vite" / "manifest.json"
        self.assertTrue(manifest.exists(), "run `npm run build` in frontend/")
        entry = json.loads(manifest.read_text())["index.html"]
        self.assertTrue((PKG / "public" / "dist" / entry["file"]).exists())

    def test_workspace_is_only_the_navigation_block(self):
        ws = json.loads((PKG / "upande_crop_material_planning" / "workspace" / "crop_material_planning" / "crop_material_planning.json").read_text())
        content = json.loads(ws["content"])
        self.assertEqual([c["type"] for c in content], ["custom_block"])
        self.assertEqual(content[0]["data"]["custom_block_name"], "Crop Material Planning Navigation")
        for k in ("charts", "number_cards", "quick_lists", "shortcuts"):
            self.assertFalse(ws.get(k), k)

    def test_navigation_tiles_point_at_react_and_classic_in_same_tab(self):
        block = json.loads((PKG / "fixtures" / "custom_html_block.json").read_text())[0]
        hrefs = re.findall(r'"(/[^"]*)"', block["script"].split("var GROUPS =")[1].split(";\n  host")[0])
        for want in ("/planning_app#/budget", "/planning_app#/forecast", "/budget-forecast", "/desk/production-budget"):
            self.assertIn(want, hrefs)
        self.assertNotIn("_blank", block["script"] + block["html"])

    def test_legacy_page_links_to_react(self):
        html = (PKG / "www" / "budget-forecast.html").read_text()
        self.assertIn('id="to-react"', html)
        self.assertIn("/planning_app#/", html)
