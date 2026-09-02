"""Tests for programmatic and PyMOL-transpiled MolQL expressions."""

import json
import unittest
from typing import get_args, get_type_hints

from pydantic import ValidationError

from molviewspec import MVSJ, MolQLExpression, PrimitiveMolQLExpression, create_builder, molql
from molviewspec.molql import (
    MS,
    AtomCorePropertyT,
    AtomMacromolecularPropertyT,
    AtomTopologyPropertyT,
    MolQLValidationError,
    from_pymol,
    transpile,
)
from molviewspec.molql.pymol import PyMOLParseError
from molviewspec.nodes import ComponentInlineParams


class TestMolQLBuilder(unittest.TestCase):
    def test_atom_groups_uses_canonical_named_arguments(self):
        ligand = molql.struct.generator.atom_groups(
            {
                "chain-test": molql.core.rel.eq(
                    [molql.struct.atom_property.macromolecular.label_asym_id(), "G"]
                )
            }
        )

        self.assertEqual(ligand["head"]["name"], "structure-query.generator.atom-groups")
        self.assertEqual(set(ligand["args"]), {"chain-test"})
        self.assertEqual(
            ligand["args"]["chain-test"]["args"][0]["head"]["name"],
            "structure-query.atom-property.macromolecular.label_asym_id",
        )

    def test_atom_groups_rejects_renamed_arguments(self):
        with self.assertRaisesRegex(ValueError, "chain_test"):
            MS.struct.generator.atom_groups({"chain_test": True})

    def test_property_helpers_accept_molstar_and_python_names(self):
        self.assertEqual(MS.ammp("residueKey"), MS.ammp("residue_key"))
        self.assertEqual(MS.ammp("B_iso_or_equiv"), MS.ammp("b_iso_or_equiv"))
        self.assertEqual(MS.ammp("pdbx_PDB_ins_code"), MS.ammp("pdbx_pdb_ins_code"))

    def test_property_helpers_expose_literal_types_and_documentation(self):
        helpers = (
            (MS.acp, AtomCorePropertyT, "atom core property"),
            (MS.atp, AtomTopologyPropertyT, "atom topology property"),
            (MS.ammp, AtomMacromolecularPropertyT, "atom macromolecular property"),
        )
        for helper, expected_type, expansion in helpers:
            with self.subTest(helper=helper.__name__):
                self.assertEqual(
                    get_args(get_type_hints(helper)["property_name"]),
                    get_args(expected_type),
                )
                self.assertIn(expansion, helper.__doc__)

    def test_canonical_module_namespace_and_wrapper_factories(self):
        expression = molql.struct.generator.atom_groups(
            {
                "atom-test": molql.core.rel.eq(
                    [molql.struct.atom_property.macromolecular.label_atom_id(), "CA"]
                )
            }
        )

        self.assertIs(molql.core, MS.core)
        self.assertIs(molql.struct, MS.struct)
        self.assertEqual(molql.selector(expression), MolQLExpression(molql=expression))
        self.assertEqual(
            molql.position(expression, structure_ref="structure"),
            PrimitiveMolQLExpression(molql=expression, structure_ref="structure"),
        )


class TestPyMOLTranspiler(unittest.TestCase):
    def test_story_query_matches_programmatic_builder(self):
        expected = MS.struct.modifier.intersect_by(
            {
                "0": MS.struct.modifier.intersect_by(
                    {
                        "0": MS.struct.generator.atom_groups(
                            {
                                "chain-test": MS.core.rel.eq(
                                    [MS.struct.atom_property.macromolecular.auth_asym_id(), "A"]
                                )
                            }
                        ),
                        "by": MS.struct.generator.atom_groups(
                            {
                                "residue-test": MS.core.rel.eq(
                                    [MS.struct.atom_property.macromolecular.auth_seq_id(), 315]
                                )
                            }
                        ),
                    }
                ),
                "by": MS.struct.generator.atom_groups(
                    {
                        "atom-test": MS.core.rel.eq(
                            [
                                MS.struct.atom_property.macromolecular.label_atom_id(),
                                MS.atom_name("OG1"),
                            ]
                        )
                    }
                ),
            }
        )

        self.assertEqual(from_pymol("chain A and resi 315 and name OG1"), expected)
        self.assertEqual(transpile("chain A and resi 315 and name OG1", language="pymol"), expected)

    def test_ranges_macros_and_operator_precedence(self):
        queries = (
            "A/100-180/CA",
            "byres polymer within 5 of resn STI",
            "solvent beyond 4 of (name O and not solvent)",
            "alt A+\"\"",
            "symbol O+N",
        )
        for query in queries:
            with self.subTest(query=query):
                expression = from_pymol(query)
                self.assertEqual(expression["head"].keys(), {"name"})
                self.assertEqual(MolQLExpression(molql=expression).molql, expression)

    def test_unsupported_pymol_features_raise_parse_errors(self):
        for query in ("visible", "foobar", "BYMOLECULE resi 20-30", "flag 0"):
            with self.subTest(query=query), self.assertRaises(PyMOLParseError):
                from_pymol(query)


class TestMolQLMVSIntegration(unittest.TestCase):
    def setUp(self):
        self.query = from_pymol("chain A")

    def test_wrappers_validate_shape_and_symbols(self):
        self.assertEqual(MolQLExpression(molql=self.query).molql, self.query)
        self.assertEqual(
            PrimitiveMolQLExpression(molql=self.query, structure_ref="structure").structure_ref,
            "structure",
        )

        with self.assertRaises(MolQLValidationError):
            MolQLExpression(molql="not-an-application")
        with self.assertRaises(MolQLValidationError):
            MolQLExpression(molql={"head": {"name": "unknown.symbol"}})
        with self.assertRaises(ValidationError):
            MolQLExpression(molql=self.query, label_seq_id=1)
        with self.assertRaises(ValidationError):
            PrimitiveMolQLExpression(molql=self.query, structure_ref=1)

    def test_mixed_wrapper_is_not_accepted_as_component_expression(self):
        with self.assertRaises(ValidationError):
            ComponentInlineParams(selector={"molql": self.query, "label_seq_id": 1})

    def test_component_color_and_primitive_positions_serialize(self):
        selector = molql.selector(self.query)
        position = molql.position(self.query, structure_ref="structure")
        builder = create_builder()
        structure = (
            builder.download(url="structure.cif")
            .parse(format="mmcif")
            .model_structure(ref="structure")
        )
        structure.component(selector=selector).representation(type="cartoon").color(
            color="red", selector=selector
        )
        structure.primitives().tube(start=position, end=position)

        serialized = json.loads(MVSJ(data=builder.get_state()).dumps())
        structure_node = serialized["root"]["children"][0]["children"][0]["children"][0]
        component = structure_node["children"][0]
        primitive = structure_node["children"][1]["children"][0]
        self.assertEqual(component["params"]["selector"], {"molql": self.query})
        self.assertEqual(
            component["children"][0]["children"][0]["params"]["selector"],
            {"molql": self.query},
        )
        self.assertEqual(
            primitive["params"]["start"],
            {"molql": self.query, "structure_ref": "structure"},
        )


if __name__ == "__main__":
    unittest.main()
