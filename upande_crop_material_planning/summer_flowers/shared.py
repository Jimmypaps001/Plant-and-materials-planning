"""Where the code planning borrows from the other apps comes from.

The Summer Flowers planner was one app; it is now split into upande_production, upande_crop_material_planning
and upande_propagation. Dependency runs one way (core <- production <- planning / propagation), so the pieces
planning runs on that are not planning's (the crop protocol logic, the root line, the settings readers, the
route ways, the planting calendar and protocol version doctypes) live in upande_production and are imported
from there, never the reverse. The few propagation pieces the plan calls (the propagation solver, motherstock
simulation, actuals) are looked up in upande_propagation lazily: planning never imports them at load time and
does not need propagation to be installed to migrate.

Everything here is lazy: a site migrating (which loads every doctype controller) never trips over a piece the
production port has not landed yet. A piece that cannot be found raises ImportError naming where it looked.

	names("crop_protocol", "PROTOCOL_DOCTYPE", "variety_names")   -> the attributes, loaded now
	module("crop_protocol")                                       -> a lazy module (attribute access loads it)
	doctype_names("planting_calendar", "x", "y")                  -> attributes of a doctype controller module
"""

import importlib

# Candidate homes for a module that was summer_flowers/<name>.py, in order.
HOMES = (
	"upande_production.summer_flowers",
	"upande_production",
	"upande_propagation",
	"upande_crop_material_planning.summer_flowers",
)

# Candidate homes for summer_flowers/doctype/<name>/<name>.py
DOCTYPE_HOMES = (
	"upande_production.crop_production.doctype",
	"upande_production.summer_flowers.doctype",
	"upande_propagation.upande_propagation.doctype",
	"upande_crop_material_planning.upande_crop_material_planning.doctype",
)


def _first(paths, what):
	last = None
	for path in paths:
		try:
			return importlib.import_module(path)
		except ModuleNotFoundError as exc:
			# Only "this module is not there" is tolerated; a missing import inside it is a real error.
			if exc.name and not path.startswith(exc.name) and exc.name != path:
				raise
			last = exc
	raise ImportError(
		f"upande_crop_material_planning needs the Summer Flowers {what} (looked in {', '.join(paths)}). "
		"It has not been ported there yet."
	) from last


def load_module(name):
	return _first([f"{h}.{name}" for h in HOMES], f"module '{name}'")


def load_doctype(name):
	return _first([f"{h}.{name}.{name}" for h in DOCTYPE_HOMES], f"doctype controller '{name}'")


def names(name, *attrs):
	mod = load_module(name)
	got = tuple(getattr(mod, a) for a in attrs)
	return got[0] if len(got) == 1 else got


def doctype_names(name, *attrs):
	mod = load_doctype(name)
	got = tuple(getattr(mod, a) for a in attrs)
	return got[0] if len(got) == 1 else got


class _Lazy:
	def __init__(self, loader, name):
		self._loader = loader
		self._name = name
		self._mod = None

	def __getattr__(self, attr):
		if attr.startswith("__"):
			raise AttributeError(attr)
		if self._mod is None:
			self._mod = self._loader(self._name)
		return getattr(self._mod, attr)

	def __repr__(self):
		return f"<lazy {self._name}>"


def module(name):
	return _Lazy(load_module, name)


def doctype_module(name):
	return _Lazy(load_doctype, name)
