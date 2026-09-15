"""Base MolQL language symbols used by the Python expression builder.

Based on Mol*'s symbol table, copyright Mol* contributors, licensed under MIT.
"""

from __future__ import annotations

import keyword
import re
from typing import Any, Generic, TypedDict, TypeVar, cast

from molviewspec.molql.expression import MolQLArgumentsT, MolQLExpressionT, apply, symbol

ArgsT = TypeVar("ArgsT")


# Functional TypedDict syntax preserves MolQL's canonical hyphenated argument names.
AtomGroupsArgsT = TypedDict(
    "AtomGroupsArgsT",
    {
        "entity-test": MolQLExpressionT,
        "chain-test": MolQLExpressionT,
        "residue-test": MolQLExpressionT,
        "atom-test": MolQLExpressionT,
        "group-by": MolQLExpressionT,
    },
    total=False,
)


class MolQLSymbol(Generic[ArgsT]):
    """Callable description of a canonical MolQL symbol."""

    def __init__(self, symbol_id: str, named_args: frozenset[str] | None = None):
        self.id = symbol_id
        self.named_args = named_args

    def __call__(self, args: ArgsT | None = None) -> MolQLExpressionT:
        if isinstance(args, dict) and self.named_args is not None:
            unknown = set(args) - self.named_args
            if unknown:
                raise ValueError(f"Unknown arguments for {self.id}: {sorted(unknown)}")
        return apply(symbol(self.id), cast(MolQLArgumentsT, args))

    def __repr__(self) -> str:
        return f"MolQLSymbol({self.id!r})"


class Namespace:
    """A closed namespace of MolQL symbols and child namespaces."""

    def __init__(self, **members: Any):
        for name, value in members.items():
            setattr(self, name, value)

    def __getattr__(self, name: str) -> Any:
        raise AttributeError(name)


class GeneratorNamespace(Namespace):
    """Structure-query generators with typed canonical atom-group arguments."""

    atom_groups: MolQLSymbol[AtomGroupsArgsT]


class StructureQueryNamespace(Namespace):
    generator: GeneratorNamespace


def _snake(name: str) -> str:
    result = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    result = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", result).lower()
    result = re.sub(r"_+", "_", result)
    return f"{result}_" if keyword.iskeyword(result) else result


def _symbols(prefix: str, names: list[str | tuple[str, str]]) -> dict[str, MolQLSymbol[Any]]:
    result: dict[str, MolQLSymbol[Any]] = {}
    for item in names:
        source, target = (item, item) if isinstance(item, str) else item
        result[_snake(source)] = MolQLSymbol(f"{prefix}.{target}")
    return result


core = Namespace(
    type=Namespace(
        **_symbols(
            "core.type",
            ["bool", "num", "str", "regex", "list", "set", "bitflags", ("compositeKey", "composite-key")],
        )
    ),
    logic=Namespace(**_symbols("core.logic", ["not", "and", "or"])),
    ctrl=Namespace(**_symbols("core.ctrl", ["eval", "fn", "if", "assoc"])),
    rel=Namespace(**_symbols("core.rel", ["eq", "neq", "lt", "lte", "gr", "gre", ("inRange", "in-range")])),
    math=Namespace(
        **_symbols(
            "core.math",
            [
                "add",
                "sub",
                "mult",
                "div",
                "pow",
                "mod",
                "min",
                "max",
                ("cantorPairing", "cantor-pairing"),
                ("sortedCantorPairing", "sorted-cantor-pairing"),
                ("invertCantorPairing", "invert-cantor-pairing"),
                "floor",
                "ceil",
                ("roundInt", "round-int"),
                "trunc",
                "abs",
                "sign",
                "sqrt",
                "cbrt",
                "sin",
                "cos",
                "tan",
                "asin",
                "acos",
                "atan",
                "sinh",
                "cosh",
                "tanh",
                "exp",
                "log",
                "log10",
                "atan2",
            ],
        )
    ),
    str=Namespace(**_symbols("core.str", ["concat", "match"])),
    list=Namespace(**_symbols("core.list", [("getAt", "get-at"), "equal"])),
    set=Namespace(**_symbols("core.set", ["has", ("isSubset", "is-subset")])),
    flags=Namespace(**_symbols("core.flags", [("hasAny", "has-any"), ("hasAll", "has-all")])),
)

_atom_groups_args = frozenset({"entity-test", "chain-test", "residue-test", "atom-test", "group-by"})
_generator_symbols = _symbols(
    "structure-query.generator",
    [
        "all",
        ("bondedAtomicPairs", "bonded-atomic-pairs"),
        "rings",
        ("queryInSelection", "query-in-selection"),
        "empty",
    ],
)
_generator_symbols["atom_groups"] = MolQLSymbol[AtomGroupsArgsT](
    "structure-query.generator.atom-groups", _atom_groups_args
)

struct = StructureQueryNamespace(
    type=Namespace(
        **_symbols(
            "structure-query.type",
            [
                ("elementSymbol", "element-symbol"),
                ("atomName", "atom-name"),
                ("entityType", "entity-type"),
                ("bondFlags", "bond-flags"),
                ("ringFingerprint", "ring-fingerprint"),
                ("secondaryStructureFlags", "secondary-structure-flags"),
                ("authResidueId", "auth-residue-id"),
                ("labelResidueId", "label-residue-id"),
            ],
        )
    ),
    slot=Namespace(**_symbols("structure-query.slot", ["element", ("elementSetReduce", "element-set-reduce")])),
    generator=GeneratorNamespace(**_generator_symbols),
    modifier=Namespace(
        **_symbols(
            "structure-query.modifier",
            [
                ("queryEach", "query-each"),
                ("intersectBy", "intersect-by"),
                ("exceptBy", "except-by"),
                ("unionBy", "union-by"),
                "union",
                "cluster",
                ("includeSurroundings", "include-surroundings"),
                ("surroundingLigands", "surrounding-ligands"),
                ("includeConnected", "include-connected"),
                ("wholeResidues", "whole-residues"),
                ("expandProperty", "expand-property"),
            ],
        )
    ),
    filter=Namespace(
        **_symbols(
            "structure-query.filter",
            [
                "pick",
                "first",
                ("withSameAtomProperties", "with-same-atom-properties"),
                ("intersectedBy", "intersected-by"),
                "within",
                ("isConnectedTo", "is-connected-to"),
            ],
        )
    ),
    combinator=Namespace(
        **_symbols(
            "structure-query.combinator",
            ["intersect", "merge", ("distanceCluster", "distance-cluster")],
        )
    ),
    atom_set=Namespace(
        **_symbols(
            "structure-query.atom-set",
            [
                ("atomCount", "atom-count"),
                ("countQuery", "count-query"),
                "reduce",
                ("propertySet", "property-set"),
            ],
        )
    ),
    atom_property=Namespace(
        core=Namespace(
            **_symbols(
                "structure-query.atom-property.core",
                [
                    ("elementSymbol", "element-symbol"),
                    "vdw",
                    "mass",
                    ("atomicNumber", "atomic-number"),
                    "x",
                    "y",
                    "z",
                    ("atomKey", "atom-key"),
                    ("bondCount", "bond-count"),
                    ("sourceIndex", "source-index"),
                    ("operatorName", "operator-name"),
                    ("instanceId", "instance-id"),
                    ("operatorKey", "operator-key"),
                    ("modelIndex", "model-index"),
                    ("modelLabel", "model-label"),
                    ("modelEntryId", "model-entry-id"),
                ],
            )
        ),
        topology=Namespace(
            **_symbols(
                "structure-query.atom-property.topology",
                [("connectedComponentKey", "connected-component-key")],
            )
        ),
        macromolecular=Namespace(
            **_symbols(
                "structure-query.atom-property.macromolecular",
                [
                    ("authResidueId", "auth-residue-id"),
                    ("labelResidueId", "label-residue-id"),
                    ("residueKey", "residue-key"),
                    ("chainKey", "chain-key"),
                    ("entityKey", "entity-key"),
                    ("isHet", "is-het"),
                    "id",
                    "label_atom_id",
                    "label_alt_id",
                    "label_comp_id",
                    "label_asym_id",
                    "label_entity_id",
                    "label_seq_id",
                    "auth_atom_id",
                    "auth_comp_id",
                    "auth_asym_id",
                    "auth_seq_id",
                    ("residueSourceIndex", "residue-source-index"),
                    "pdbx_PDB_ins_code",
                    "pdbx_formal_charge",
                    "occupancy",
                    "B_iso_or_equiv",
                    ("entityType", "entity-type"),
                    ("entitySubtype", "entity-subtype"),
                    ("entityPrdId", "entity-prd-id"),
                    ("entityDescription", "entity-description"),
                    ("objectPrimitive", "object-primitive"),
                    ("secondaryStructureKey", "secondary-structure-key"),
                    ("secondaryStructureFlags", "secondary-structure-flags"),
                    ("isModified", "is-modified"),
                    ("modifiedParentName", "modified-parent-name"),
                    ("isNonStandard", "is-non-standard"),
                    ("chemCompType", "chem-comp-type"),
                ],
            )
        ),
        ihm=Namespace(
            **_symbols(
                "structure-query.atom-property.ihm",
                [
                    ("hasSeqId", "has-seq-id"),
                    ("overlapsSeqIdRange", "overlaps-seq-id-range"),
                ],
            )
        ),
    ),
    bond_property=Namespace(
        **_symbols(
            "structure-query.bond-property",
            ["flags", "order", "key", "length", ("atomA", "atom-a"), ("atomB", "atom-b")],
        )
    ),
)


def _collect_symbols(value: object, result: set[str]) -> None:
    if isinstance(value, MolQLSymbol):
        result.add(value.id)
        return
    if isinstance(value, Namespace):
        for child in vars(value).values():
            _collect_symbols(child, result)


KNOWN_SYMBOLS: set[str] = set()
_collect_symbols(core, KNOWN_SYMBOLS)
_collect_symbols(struct, KNOWN_SYMBOLS)
