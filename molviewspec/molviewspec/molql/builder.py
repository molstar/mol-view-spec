"""Programmatic builder for serialized base MolQL expressions.

Based on Mol*'s MolScriptBuilder, copyright Mol* contributors, licensed under MIT.
"""

from __future__ import annotations

import re
from typing import Literal, TypeAlias

from molviewspec.molql.expression import MolQLExpressionT
from molviewspec.molql.language import core, struct

AtomCorePropertyT: TypeAlias = Literal[
    "elementSymbol",
    "element_symbol",
    "vdw",
    "mass",
    "atomicNumber",
    "atomic_number",
    "x",
    "y",
    "z",
    "atomKey",
    "atom_key",
    "bondCount",
    "bond_count",
    "sourceIndex",
    "source_index",
    "operatorName",
    "operator_name",
    "instanceId",
    "instance_id",
    "operatorKey",
    "operator_key",
    "modelIndex",
    "model_index",
    "modelLabel",
    "model_label",
    "modelEntryId",
    "model_entry_id",
]

AtomTopologyPropertyT: TypeAlias = Literal[
    "connectedComponentKey",
    "connected_component_key",
]

AtomMacromolecularPropertyT: TypeAlias = Literal[
    "authResidueId",
    "auth_residue_id",
    "labelResidueId",
    "label_residue_id",
    "residueKey",
    "residue_key",
    "chainKey",
    "chain_key",
    "entityKey",
    "entity_key",
    "isHet",
    "is_het",
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
    "residueSourceIndex",
    "residue_source_index",
    "pdbx_PDB_ins_code",
    "pdbx_pdb_ins_code",
    "pdbx_formal_charge",
    "occupancy",
    "B_iso_or_equiv",
    "b_iso_or_equiv",
    "entityType",
    "entity_type",
    "entitySubtype",
    "entity_subtype",
    "entityPrdId",
    "entity_prd_id",
    "entityDescription",
    "entity_description",
    "objectPrimitive",
    "object_primitive",
    "secondaryStructureKey",
    "secondary_structure_key",
    "secondaryStructureFlags",
    "secondary_structure_flags",
    "isModified",
    "is_modified",
    "modifiedParentName",
    "modified_parent_name",
    "isNonStandard",
    "is_non_standard",
    "chemCompType",
    "chem_comp_type",
]


class MolScriptBuilder:
    """Python counterpart of Mol*'s base-language ``MolScriptBuilder``."""

    core = core
    struct = struct

    @staticmethod
    def atom_name(value: str) -> MolQLExpressionT:
        """Build an atom-name value expression."""

        return struct.type.atom_name([value])

    @staticmethod
    def es(value: str) -> MolQLExpressionT:
        """Build an element-symbol value expression (``es`` = element symbol)."""

        return struct.type.element_symbol([value])

    @staticmethod
    def list(*values: MolQLExpressionT) -> MolQLExpressionT:
        """Build a MolQL list value from positional expressions."""

        return core.type.list(list(values))

    @staticmethod
    def set(*values: MolQLExpressionT) -> MolQLExpressionT:
        """Build a MolQL set value from positional expressions."""

        return core.type.set(list(values))

    @staticmethod
    def re(pattern: str, flags: str = "") -> MolQLExpressionT:
        """Build a regular-expression value expression."""

        return core.type.regex([pattern, flags])

    @staticmethod
    def fn(value: MolQLExpressionT) -> MolQLExpressionT:
        """Build a MolQL function expression."""

        return core.ctrl.fn([value])

    @staticmethod
    def evaluate(value: MolQLExpressionT) -> MolQLExpressionT:
        """Build an expression that evaluates a MolQL function."""

        return core.ctrl.eval([value])

    @staticmethod
    def acp(property_name: AtomCorePropertyT) -> MolQLExpressionT:
        """Build an atom core property expression (``acp`` = atom core property)."""

        return getattr(struct.atom_property.core, _property_name(property_name))()

    @staticmethod
    def atp(property_name: AtomTopologyPropertyT) -> MolQLExpressionT:
        """Build an atom topology property expression (``atp`` = atom topology property)."""

        return getattr(struct.atom_property.topology, _property_name(property_name))()

    @staticmethod
    def ammp(property_name: AtomMacromolecularPropertyT) -> MolQLExpressionT:
        """Build a macromolecular property expression (``ammp`` = atom macromolecular property)."""

        return getattr(struct.atom_property.macromolecular, _property_name(property_name))()

    @staticmethod
    def acp_set(property_name: AtomCorePropertyT) -> MolQLExpressionT:
        """Build an atom-set projection for an atom core property."""

        return struct.atom_set.property_set([MolScriptBuilder.acp(property_name)])

    @staticmethod
    def atp_set(property_name: AtomTopologyPropertyT) -> MolQLExpressionT:
        """Build an atom-set projection for an atom topology property."""

        return struct.atom_set.property_set([MolScriptBuilder.atp(property_name)])

    @staticmethod
    def ammp_set(property_name: AtomMacromolecularPropertyT) -> MolQLExpressionT:
        """Build an atom-set projection for a macromolecular property."""

        return struct.atom_set.property_set([MolScriptBuilder.ammp(property_name)])


MS = MolScriptBuilder


def _property_name(name: str) -> str:
    result = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    result = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", result).lower()
    return re.sub(r"_+", "_", result)
