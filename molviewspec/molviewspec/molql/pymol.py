"""Dependency-free PyMOL selection transpiler.

This module mirrors the supported subset of Mol*'s PyMOL transpiler and eagerly
produces JSON-native base MolQL expressions.

Ported from Mol*, copyright 2017-2026 Mol* contributors, licensed under MIT.
Original PyMOL transpiler authors include Alexander Rose, Panagiotis Tourlas,
Koya Sakuma, and David Sehnal.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable, Literal

from molviewspec.molql.builder import MolScriptBuilder as B
from molviewspec.molql.expression import MolQLExpressionT


class PyMOLParseError(ValueError):
    """Raised when a PyMOL selection cannot be transpiled."""


def _and_expr(values: list[MolQLExpressionT]) -> MolQLExpressionT | None:
    if not values:
        return None
    return values[0] if len(values) == 1 else B.core.logic.and_(values)


def _test_expr(property_: MolQLExpressionT, value: Any) -> MolQLExpressionT:
    if isinstance(value, dict) and "op" in value and "val" in value:
        args = [property_, value["val"]]
        return {
            "=": B.core.rel.eq,
            "!=": B.core.rel.neq,
            ">": B.core.rel.gr,
            "<": B.core.rel.lt,
            ">=": B.core.rel.gre,
            "<=": B.core.rel.lte,
        }[value["op"]](args)
    if isinstance(value, dict) and "flags" in value:
        return B.core.flags.has_any([property_, value["flags"]])
    if isinstance(value, dict) and "min" in value and "max" in value:
        return B.core.rel.in_range([property_, value["min"], value["max"]])
    if not isinstance(value, list):
        return B.core.rel.eq([property_, value])
    if len(value) > 1:
        return B.core.set.has([B.core.type.set(value), property_])
    return B.core.rel.eq([property_, value[0]])


def _invert(selection: MolQLExpressionT) -> MolQLExpressionT:
    return B.struct.generator.query_in_selection({
        "0": selection,
        "query": B.struct.generator.all(),
        "in-complement": True,
    })


def _as_atoms(selection: MolQLExpressionT) -> MolQLExpressionT:
    return B.struct.generator.query_in_selection({"0": selection, "query": B.struct.generator.all()})


def _atom_name_set(names: list[str]) -> MolQLExpressionT:
    return B.core.type.set([B.atom_name(name) for name in names])


def _list_map(value: str) -> list[str]:
    return [part.strip("\"'") for part in value.split("+")]


def _int_list_or_range(value: str) -> list[int]:
    result: list[int] = []
    for item in value.split("+"):
        range_match = re.fullmatch(r"(-?\d+)-(-?\d+)", item)
        if range_match:
            start, end = int(range_match.group(1)), int(range_match.group(2))
            result.extend(range(start, end + 1))
        else:
            result.append(int(item))
    return result


@dataclass(frozen=True)
class _Property:
    names: tuple[str, ...]
    value_pattern: str
    map_value: Callable[[str], Any]
    level: str
    property: MolQLExpressionT | None = None
    numeric: bool = False
    unsupported: bool = False


_FLOAT = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)"
_PROPERTIES = [
    _Property(
        ("symbol", "e."),
        r"[a-zA-Z'\"+]+",
        lambda s: [B.es(x) for x in s.split("+")],
        "atom-test",
        B.acp("element_symbol"),
    ),
    _Property(
        ("name", "n."),
        r"[a-zA-Z0-9'\"+]+",
        lambda s: [B.atom_name(x) for x in s.split("+")],
        "atom-test",
        B.ammp("label_atom_id"),
    ),
    _Property(("resn", "resname", "r."), r"[a-zA-Z0-9'\"+]+", _list_map, "residue-test", B.ammp("label_comp_id")),
    _Property(
        ("resi", "resident", "residue", "resid", "i."),
        r"[0-9+\-]+",
        _int_list_or_range,
        "residue-test",
        B.ammp("auth_seq_id"),
    ),
    _Property(("alt",), r"[a-zA-Z0-9'\"+]+", _list_map, "atom-test", B.ammp("label_alt_id")),
    _Property(("chain", "c."), r"[a-zA-Z0-9'\"+]+", _list_map, "chain-test", B.ammp("auth_asym_id")),
    _Property(("segi", "segid", "s."), r"[a-zA-Z0-9'\"+]+", _list_map, "chain-test", B.ammp("label_asym_id")),
    _Property(("flag", "f."), r"[0-9]+", int, "atom-test", unsupported=True),
    _Property(("numeric_type", "nt."), r"[0-9]+", int, "atom-test", unsupported=True),
    _Property(("text_type", "tt."), r"[a-zA-Z0-9'\"+]+", _list_map, "atom-test", unsupported=True),
    _Property(("id",), r"[0-9+\-]+", _int_list_or_range, "atom-test", B.ammp("id")),
    _Property(("index",), r"[0-9+\-]+", _int_list_or_range, "atom-test", B.ammp("id")),
    _Property(
        ("ss",),
        r"[a-zA-Z'\"+]+",
        lambda s: {
            "flags": B.struct.type.secondary_structure_flags(
                [{"H": "helix", "S": "beta", "L": "none"}.get(x.upper(), "none") for x in _list_map(s)]
            )
        },
        "residue-test",
        B.ammp("secondary_structure_flags"),
    ),
    _Property(("b",), _FLOAT, float, "atom-test", B.ammp("b_iso_or_equiv"), numeric=True),
    _Property(("q",), _FLOAT, float, "atom-test", B.ammp("occupancy"), numeric=True),
    _Property(("formal_charge", "fc."), _FLOAT, float, "atom-test", B.ammp("pdbx_formal_charge"), numeric=True),
    _Property(("partial_charge", "pc."), _FLOAT, float, "atom-test", numeric=True, unsupported=True),
    _Property(("elem",), r"[a-zA-Z0-9]{1,3}", B.es, "atom-test", B.acp("element_symbol")),
]

_PROPERTY_NAMES = sorted(
    [(name, prop) for prop in _PROPERTIES for name in prop.names],
    key=lambda item: len(item[0]),
    reverse=True,
)

_NUCLEIC = ["A", "C", "T", "G", "U", "DA", "DC", "DT", "DG", "DU"]
_PROTEIN = [
    "ALA", "ARG", "ASN", "ASP", "CYS", "CYX", "GLN", "GLU", "GLY", "HIS", "HID", "HIE", "HIP",
    "ILE", "LEU", "LYS", "MET", "MSE", "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL",
]
_SOLVENT = ["HOH", "WAT", "H20", "TIP", "SOL"]
_NUCLEIC_BACKBONE = [
    "P", "O3'", "O5'", "C5'", "C4'", "C3'", "OP1", "OP2", "O3*", "O5*", "C5*", "C4*", "C3*",
    "C2'", "C1'", "O4'", "O2'",
]
_PROTEIN_BACKBONE = ["C", "N", "CA", "O"]


def _backbone() -> MolQLExpressionT:
    def branch(residues: list[str], atoms: list[str]) -> MolQLExpressionT:
        return B.struct.modifier.intersect_by({
            "0": B.struct.generator.atom_groups({
                "residue-test": B.core.set.has([B.core.type.set(residues), B.ammp("label_comp_id")]),
            }),
            "by": B.struct.generator.atom_groups({
                "atom-test": B.core.set.has([B.core.type.set(atoms), B.ammp("label_atom_id")]),
            }),
        })

    return B.struct.combinator.merge([branch(_PROTEIN, _PROTEIN_BACKBONE), branch(_NUCLEIC, _NUCLEIC_BACKBONE)])


def _keyword(name: str) -> MolQLExpressionT:
    if name == "all":
        return B.struct.generator.all()
    if name == "none":
        return B.struct.generator.empty()
    if name == "hydrogens":
        return B.struct.generator.atom_groups({"atom-test": B.core.rel.eq([B.acp("element_symbol"), B.es("H")])})
    if name == "hetatm":
        return B.struct.generator.atom_groups({"atom-test": B.core.rel.eq([B.ammp("is_het"), True])})
    if name == "polymer":
        return B.struct.generator.atom_groups(
            {"residue-test": B.core.set.has([B.core.type.set(_NUCLEIC + _PROTEIN), B.ammp("label_comp_id")])}
        )
    if name == "sidechain":
        return B.struct.modifier.except_by({
            "0": B.struct.generator.atom_groups(
                {
                    "residue-test": B.core.set.has(
                        [B.core.type.set(_NUCLEIC + _PROTEIN), B.ammp("label_comp_id")]
                    )
                }
            ),
            "by": _backbone(),
        })
    if name == "bonded":
        return B.struct.generator.atom_groups({
            "atom-test": B.core.rel.gr([
                B.struct.atom_property.core.bond_count(
                    {"flags": B.struct.type.bond_flags(["covalent", "metallic", "sulfide"])}
                ),
                0,
            ])
        })
    if name == "organic":
        return _as_atoms(B.struct.modifier.expand_property({
            "0": B.struct.modifier.union([
                B.struct.generator.query_in_selection({
                    "0": B.struct.generator.atom_groups({
                        "residue-test": B.core.logic.not_(
                            [B.core.set.has([B.core.type.set(_NUCLEIC + _PROTEIN), B.ammp("label_comp_id")])]
                        )
                    }),
                    "query": B.struct.generator.atom_groups(
                        {"atom-test": B.core.rel.eq([B.es("C"), B.acp("element_symbol")])}
                    ),
                })
            ]),
            "property": B.ammp("residue_key"),
        }))
    if name == "inorganic":
        return _as_atoms(B.struct.modifier.expand_property({
            "0": B.struct.modifier.union([
                B.struct.filter.pick({
                    "0": B.struct.generator.atom_groups({
                        "residue-test": B.core.logic.not_(
                            [
                                B.core.set.has(
                                    [
                                        B.core.type.set(_NUCLEIC + _PROTEIN + _SOLVENT),
                                        B.ammp("label_comp_id"),
                                    ]
                                )
                            ]
                        ),
                        "group-by": B.ammp("residue_key"),
                    }),
                    "test": B.core.logic.not_(
                        [B.core.set.has([B.struct.atom_set.property_set([B.acp("element_symbol")]), B.es("C")])]
                    ),
                })
            ]),
            "property": B.ammp("residue_key"),
        }))
    if name == "solvent":
        return B.struct.generator.atom_groups(
            {"residue-test": B.core.set.has([B.core.type.set(_SOLVENT), B.ammp("label_comp_id")])}
        )
    if name == "guide":
        return B.struct.combinator.merge([
            B.struct.generator.atom_groups({
                "atom-test": B.core.rel.eq([B.atom_name("CA"), B.ammp("label_atom_id")]),
                "residue-test": B.core.set.has([B.core.type.set(_PROTEIN), B.ammp("label_comp_id")]),
            }),
            B.struct.generator.atom_groups({
                "atom-test": B.core.set.has([_atom_name_set(["C4*", "C4'"]), B.ammp("label_atom_id")]),
                "residue-test": B.core.set.has([B.core.type.set(_NUCLEIC), B.ammp("label_comp_id")]),
            }),
        ])
    if name == "backbone":
        return _backbone()
    if name == "polymer.protein":
        return B.struct.generator.atom_groups(
            {"residue-test": B.core.set.has([B.core.type.set(_PROTEIN), B.ammp("label_comp_id")])}
        )
    if name == "polymer.nucleic":
        return B.struct.generator.atom_groups(
            {"residue-test": B.core.set.has([B.core.type.set(_NUCLEIC), B.ammp("label_comp_id")])}
        )
    raise PyMOLParseError(f"PyMOL keyword '{name}' is not supported")


_KEYWORDS: dict[str, tuple[str, ...]] = {
    "all": ("all", "*"), "none": ("none",), "hydrogens": ("hydrogens", "hydro", "h."),
    "hetatm": ("hetatm", "het"), "visible": ("visible", "v."), "polymer": ("polymer", "pol."),
    "sidechain": ("sidechain", "sc."), "present": ("present", "pr."), "center": ("center",),
    "origin": ("origin",), "enabled": ("enabled",), "masked": ("masked", "msk."),
    "protected": ("protected", "pr."), "bonded": ("bonded",), "donors": ("donors", "don."),
    "acceptors": ("acceptors", "acc."), "fixed": ("fixed", "fxd."), "restrained": ("restrained", "rst."),
    "organic": ("organic", "org."), "inorganic": ("inorganic", "ino."), "solvent": ("solvent", "sol."),
    "guide": ("guide",), "metals": ("metals",), "backbone": ("backbone", "bb."),
    "polymer.protein": ("polymer.protein",), "polymer.nucleic": ("polymer.nucleic",),
}
_KEYWORD_NAMES = sorted(
    [(alias, name) for name, aliases in _KEYWORDS.items() for alias in aliases],
    key=lambda item: len(item[0]),
    reverse=True,
)


OperatorKind = Literal["prefix", "postfix", "binary"]
_OPERATORS: list[tuple[str, OperatorKind]] = [
    ("not", "prefix"), ("and", "binary"), ("or", "binary"), ("in", "binary"), ("like", "binary"),
    ("gap", "postfix"), ("around", "postfix"), ("expand", "postfix"), ("within", "binary"),
    ("near_to", "binary"), ("beyond", "binary"), ("byresidue", "prefix"), ("bycalpha", "prefix"),
    ("bymolecule", "prefix"), ("byfragment", "prefix"), ("bysegment", "prefix"), ("byobject", "prefix"),
    ("bycell", "prefix"), ("byring", "prefix"), ("neighbor", "prefix"), ("bound_to", "prefix"),
    ("extend", "postfix"),
]


class _Parser:
    def __init__(self, source: str):
        self.source = source
        self.pos = 0

    def parse(self) -> MolQLExpressionT:
        self._ws()
        result = self._level(len(_OPERATORS) - 1)
        self._ws()
        if self.pos != len(self.source):
            self._error("Unexpected input")
        return result

    def _level(self, index: int) -> MolQLExpressionT:
        if index < 0:
            return self._base()
        name, kind = _OPERATORS[index]
        if kind == "prefix":
            start = self.pos
            payload = self._operator(name)
            if payload is not None:
                return self._map_prefix(name, self._level(index))
            self.pos = start
            return self._level(index - 1)
        value = self._level(index - 1)
        if kind == "postfix":
            while True:
                start = self.pos
                payload = self._operator(name)
                if payload is None:
                    self.pos = start
                    break
                value = self._map_postfix(name, payload, value)
            return value
        while True:
            start = self.pos
            payload = self._operator(name)
            if payload is None:
                self.pos = start
                break
            right = self._level(index - 1)
            value = self._map_binary(name, payload, value, right)
        return value

    def _base(self) -> MolQLExpressionT:
        self._ws()
        if self._take_literal("("):
            value = self._level(len(_OPERATORS) - 1)
            self._ws()
            if not self._take_literal(")"):
                self._error("Expected ')'")
            return value
        macro = self._atom_macro()
        if macro is not None:
            return macro
        property_ = self._named_property()
        if property_ is not None:
            return property_
        keyword = self._named_keyword()
        if keyword is not None:
            return keyword
        if self._match(r"(?:PEPSEQ|ps\.)\s+[a-z]+", boundary=False):
            raise PyMOLParseError("PyMOL operator 'pepseq' is not supported")
        if self._match(r"REP\s+\S+", boundary=False):
            raise PyMOLParseError("PyMOL operator 'rep' is not supported")
        token = self._match(r"[A-Z0-9_]+", boundary=True)
        if token is not None:
            raise PyMOLParseError(f"PyMOL property 'object' is not supported, value '{token}'")
        self._error("Expected a PyMOL selection")

    def _atom_macro(self) -> MolQLExpressionT | None:
        self._ws()
        start = self.pos
        token_match = re.match(r"[^\s()]+", self.source[self.pos :])
        if not token_match or "/" not in token_match.group(0):
            return None
        token = token_match.group(0)
        self.pos += len(token)
        leading = token.startswith("/")
        parts = token.split("/")[1:] if leading else token.split("/")
        if len(parts) > 5 or not leading and len(parts) < 2:
            self.pos = start
            return None
        if leading:
            fields = ["object", "segi", "chain", "resi", "name"][: len(parts)]
        else:
            fields = {
                2: ["resi", "name"],
                3: ["chain", "resi", "name"],
                4: ["segi", "chain", "resi", "name"],
                5: ["object", "segi", "chain", "resi", "name"],
            }[len(parts)]
        tests: dict[str, list[MolQLExpressionT]] = {}
        for field, raw in zip(fields, parts):
            if not raw:
                continue
            if field == "object":
                raise PyMOLParseError(f"PyMOL property 'object' is not supported, value '{raw}'")
            prop = next(prop for prop in _PROPERTIES if prop.names[0] == field)
            if not re.fullmatch(prop.value_pattern, raw, re.IGNORECASE):
                raise PyMOLParseError(f"Invalid PyMOL {field} value '{raw}'")
            test = _test_expr(prop.property, prop.map_value(raw))  # type: ignore[arg-type]
            tests.setdefault(prop.level, []).append(test)
        return B.struct.generator.atom_groups(
            {level: _and_expr(values) for level, values in tests.items()}
        )  # type: ignore[arg-type]

    def _named_property(self) -> MolQLExpressionT | None:
        self._ws()
        for name, prop in _PROPERTY_NAMES:
            start = self.pos
            if self._match(re.escape(name), boundary=True) is None:
                self.pos = start
                continue
            self._ws()
            if prop.numeric:
                op = self._match(r">=|<=|!=|=|>|<", boundary=False)
                if op is None:
                    self.pos = start
                    continue
                self._ws()
                raw = self._match(prop.value_pattern, boundary=False)
                if raw is None:
                    self._error(f"Expected value for property '{name}'")
                value: Any = {"op": op, "val": prop.map_value(raw)}
            else:
                raw = self._match(prop.value_pattern, boundary=False)
                if raw is None:
                    self.pos = start
                    continue
                value = prop.map_value(raw)
            if prop.unsupported or prop.property is None:
                raise PyMOLParseError(f"PyMOL property '{prop.names[0]}' is not supported")
            return B.struct.generator.atom_groups(
                {prop.level: _test_expr(prop.property, value)}
            )  # type: ignore[arg-type]
        return None

    def _named_keyword(self) -> MolQLExpressionT | None:
        self._ws()
        for alias, name in _KEYWORD_NAMES:
            start = self.pos
            if self._match(re.escape(alias), boundary=True) is not None:
                return _keyword(name)
            self.pos = start
        return None

    def _operator(self, name: str) -> Any | None:
        self._ws()
        patterns: dict[str, str] = {
            "not": r"NOT(?=\s)|!", "and": r"AND|&", "or": r"OR|\|", "in": r"IN", "like": r"LIKE|l\.",
            "byresidue": r"BYRESIDUE|byresi|byres|br\.", "bycalpha": r"BYCALPHA|bca\.",
            "bymolecule": r"BYMOLECULE|bymol|bm\.", "byfragment": r"BYFRAGMENT|byfrag|bf\.",
            "bysegment": r"BYSEGMENT|bysegi|byseg|bs\.", "byobject": r"BYOBJECT|byobj|bo\.",
            "bycell": r"BYCELL", "byring": r"BYRING", "neighbor": r"NEIGHBOR|nbr\.",
            "bound_to": r"BOUND_TO|bto\.",
        }
        if name in patterns:
            value = self._match(patterns[name], boundary=True)
            if value is not None:
                self._ws()
            return value
        if name in {"gap", "around", "expand", "extend"}:
            names = {"gap": r"GAP", "around": r"AROUND|a\.", "expand": r"EXPAND|x\.", "extend": r"EXTEND|xt\."}[name]
            number_pattern = r"[0-9]+" if name == "extend" else _FLOAT
            match = self._match(rf"(?:{names})\s+({number_pattern})", boundary=False, group=1)
            return None if match is None else (int(match) if name == "extend" else float(match))
        if name in {"within", "near_to", "beyond"}:
            names = {"within": r"WITHIN|w\.", "near_to": r"NEAR_TO|nto\.", "beyond": r"BEYOND|be\."}[name]
            match = self._match(rf"(?:{names})\s+({_FLOAT})\s+OF", boundary=False, group=1)
            return None if match is None else float(match)
        return None

    def _map_prefix(self, name: str, selection: MolQLExpressionT) -> MolQLExpressionT:
        if name == "not":
            return _invert(selection)
        if name == "byresidue":
            return _as_atoms(
                B.struct.modifier.expand_property(
                    {"0": B.struct.modifier.union({"0": selection}), "property": B.ammp("residue_key")}
                )
            )
        if name == "bycalpha":
            return B.struct.generator.query_in_selection({
                "0": B.struct.modifier.expand_property(
                    {"0": B.struct.modifier.union({"0": selection}), "property": B.ammp("residue_key")}
                ),
                "query": B.struct.generator.atom_groups(
                    {"atom-test": B.core.rel.eq([B.atom_name("CA"), B.ammp("label_atom_id")])}
                ),
            })
        if name == "bysegment":
            return _as_atoms(
                B.struct.modifier.expand_property(
                    {"0": B.struct.modifier.union({"0": selection}), "property": B.ammp("chain_key")}
                )
            )
        if name == "byring":
            return _as_atoms(B.struct.modifier.intersect_by({
                "0": B.struct.filter.pick({
                    "0": B.struct.generator.rings(),
                    "test": B.core.logic.and_([
                        B.core.rel.lte([B.struct.atom_set.atom_count(), 7]),
                        B.core.rel.gr([B.struct.atom_set.count_query([selection]), 1]),
                    ]),
                }),
                "by": selection,
            }))
        if name == "neighbor":
            return B.struct.modifier.except_by({
                "0": _as_atoms(
                    B.struct.modifier.include_connected(
                        {"0": B.struct.modifier.union({"0": selection}), "bond-test": True}
                    )
                ),
                "by": selection,
            })
        if name == "bound_to":
            return _as_atoms(B.struct.modifier.include_connected({"0": B.struct.modifier.union({"0": selection})}))
        raise PyMOLParseError(f"PyMOL operator '{name}' is not supported")

    def _map_postfix(self, name: str, value: float | int, selection: MolQLExpressionT) -> MolQLExpressionT:
        if name == "gap":
            return B.struct.filter.within(
                {
                    "0": B.struct.generator.all(),
                    "target": selection,
                    "atom-radius": B.acp("vdw"),
                    "max-radius": value,
                    "invert": True,
                }
            )
        if name == "around":
            return B.struct.modifier.except_by(
                {
                    "0": B.struct.filter.within(
                        {"0": B.struct.generator.all(), "target": selection, "max-radius": value}
                    ),
                    "by": selection,
                }
            )
        if name == "expand":
            return B.struct.modifier.include_surroundings({"0": selection, "radius": value})
        if name == "extend":
            return _as_atoms(
                B.struct.modifier.include_connected(
                    {
                        "0": B.struct.modifier.union({"0": selection}),
                        "bond-test": True,
                        "layer-count": value,
                    }
                )
            )
        self._error(f"Unsupported postfix operator '{name}'")

    def _map_binary(self, name: str, value: Any, left: MolQLExpressionT, right: MolQLExpressionT) -> MolQLExpressionT:
        if name == "and":
            return B.struct.modifier.intersect_by({"0": left, "by": right})
        if name == "or":
            return B.struct.combinator.merge([left, right])
        if name == "in":
            return B.struct.filter.with_same_atom_properties({
                "0": left, "source": right,
                "property": B.core.type.composite_key([
                    B.ammp("label_atom_id"), B.ammp("label_seq_id"), B.ammp("label_comp_id"),
                    B.ammp("auth_asym_id"), B.ammp("label_asym_id"),
                ]),
            })
        if name == "like":
            return B.struct.filter.with_same_atom_properties({
                "0": left, "source": right,
                "property": B.core.type.composite_key([B.ammp("label_atom_id"), B.ammp("label_seq_id")]),
            })
        if name == "within":
            return B.struct.filter.within({"0": left, "target": right, "max-radius": value})
        if name == "near_to":
            return B.struct.modifier.except_by(
                {"0": B.struct.filter.within({"0": left, "target": right, "max-radius": value}), "by": right}
            )
        if name == "beyond":
            return B.struct.modifier.except_by(
                {
                    "0": B.struct.filter.within(
                        {"0": left, "target": right, "max-radius": value, "invert": True}
                    ),
                    "by": right,
                }
            )
        self._error(f"Unsupported binary operator '{name}'")

    def _match(self, pattern: str, *, boundary: bool, group: int = 0) -> str | None:
        regex = pattern + (r"(?![A-Za-z0-9_.])" if boundary else "")
        match = re.match(regex, self.source[self.pos :], re.IGNORECASE)
        if not match:
            return None
        self.pos += match.end()
        return match.group(group)

    def _take_literal(self, value: str) -> bool:
        if self.source.startswith(value, self.pos):
            self.pos += len(value)
            return True
        return False

    def _ws(self) -> None:
        while self.pos < len(self.source) and self.source[self.pos].isspace():
            self.pos += 1

    def _error(self, message: str) -> None:
        raise PyMOLParseError(f"{message} at position {self.pos}: {self.source[self.pos:self.pos + 20]!r}")


def parse(source: str) -> MolQLExpressionT:
    """Parse a PyMOL selection and eagerly transpile it to base MolQL."""

    if not source.strip():
        raise PyMOLParseError("PyMOL selection must not be empty")
    return _Parser(source).parse()


__all__ = ["PyMOLParseError", "parse"]
