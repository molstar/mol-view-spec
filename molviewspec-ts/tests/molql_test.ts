/** Tests for programmatic and PyMOL-transpiled MolQL expressions. */

import { assertEquals, assertThrows } from "@std/assert";
import { createBuilder, molql } from "../mod.ts";
import type { Node } from "../molviewspec/nodes.ts";
import * as pymol from "../molviewspec/molql/transpilers/pymol/mod.ts";
import { keywords } from "../molviewspec/molql/transpilers/pymol/keywords.ts";
import { operators } from "../molviewspec/molql/transpilers/pymol/operators.ts";
import { properties } from "../molviewspec/molql/transpilers/pymol/properties.ts";

function findNodes(node: Node, kind: string): Node[] {
  const result = node.kind === kind ? [node] : [];
  for (const child of node.children ?? []) result.push(...findNodes(child, kind));
  return result;
}

Deno.test("molql - builder preserves canonical named arguments", () => {
  const ligand = molql.struct.generator.atomGroups({
    "chain-test": molql.core.rel.eq([
      molql.struct.atomProperty.macromolecular.label_asym_id(),
      "G",
    ]),
  });

  assertEquals(ligand, {
    head: { name: "structure-query.generator.atom-groups" },
    args: {
      "chain-test": {
        head: { name: "core.rel.eq" },
        args: [
          {
            head: {
              name: "structure-query.atom-property.macromolecular.label_asym_id",
            },
          },
          "G",
        ],
      },
    },
  });
});

Deno.test("molql - builder types reject renamed arguments and unknown properties", () => {
  function typeCheckOnly() {
    molql.struct.generator.atomGroups({
      // @ts-expect-error MolQL named arguments retain their canonical spelling.
      chain_test: true,
    });

    // @ts-expect-error Property helpers expose the Mol* property-name literals.
    molql.ammp("notAProperty");
  }
  void typeCheckOnly;
});

Deno.test("molql - PyMOL transpilation matches the programmatic builder", () => {
  const expected = molql.struct.modifier.intersectBy({
    0: molql.struct.modifier.intersectBy({
      0: molql.struct.generator.atomGroups({
        "chain-test": molql.core.rel.eq([
          molql.struct.atomProperty.macromolecular.auth_asym_id(),
          "A",
        ]),
      }),
      by: molql.struct.generator.atomGroups({
        "residue-test": molql.core.rel.eq([
          molql.struct.atomProperty.macromolecular.auth_seq_id(),
          315,
        ]),
      }),
    }),
    by: molql.struct.generator.atomGroups({
      "atom-test": molql.core.rel.eq([
        molql.struct.atomProperty.macromolecular.label_atom_id(),
        molql.atomName("OG1"),
      ]),
    }),
  });

  assertEquals(
    pymol.transpile("chain A and resi 315 and name OG1"),
    expected,
  );
});

Deno.test("molql - PyMOL supports representative macros, ranges, and operators", () => {
  for (
    const source of [
      "A/100-180/CA",
      "byres polymer within 5 of resn STI",
      "solvent beyond 4 of (name O and not solvent)",
      'alt A+""',
      "symbol O+N",
    ]
  ) {
    const expression = pymol.transpile(source);
    assertEquals(molql.Expression.isApply(expression), true);
  }
});

Deno.test("molql - unsupported PyMOL features and invalid wrappers fail eagerly", () => {
  for (const source of ["visible", "foobar", "BYMOLECULE resi 20-30", "flag 0"]) {
    assertThrows(() => pymol.transpile(source));
  }
  assertThrows(() => molql.selector("not-an-application"));
  assertThrows(() =>
    molql.selector({
      head: { name: "unknown.symbol" },
    })
  );
});

Deno.test("molql - component, color, and primitive positions serialize", () => {
  const query = pymol.transpile("chain A");
  const selector = molql.selector(query);
  const position = molql.position(query, "structure");

  const builder = createBuilder();
  const structure = builder
    .download({ url: "structure.cif" })
    .parse({ format: "mmcif" })
    .modelStructure({}, undefined, "structure");

  structure.component({ selector })
    .representation({ type: "cartoon" })
    .color({ color: "red", selector });
  structure.primitives().distance({ start: position, end: position });

  const state = builder.getState();
  const components = findNodes(state.root, "component");
  const colors = findNodes(state.root, "color");
  const primitives = findNodes(state.root, "primitive");

  assertEquals(components[0].params?.selector, { molql: query });
  assertEquals(colors[0].params?.selector, { molql: query });
  assertEquals(primitives[0].params?.kind, "distance_measurement");
  assertEquals(primitives[0].params?.start, {
    molql: query,
    structure_ref: "structure",
  });
});

for (const [name, keyword] of Object.entries(keywords)) {
  Deno.test(`molql - PyMOL keyword: ${name}`, () => {
    if (keyword.map) {
      assertEquals(pymol.transpile(name), keyword.map());
    } else {
      assertThrows(() => pymol.transpile(name));
    }
  });
}

for (const [name, property] of Object.entries(properties)) {
  for (const example of property["@examples"]) {
    Deno.test(`molql - PyMOL property: ${name} (${example})`, () => {
      if (property.isUnsupported) {
        assertThrows(() => pymol.transpile(example));
      } else {
        pymol.transpile(example);
      }
    });
  }
}

for (const operator of operators) {
  for (const example of operator["@examples"]) {
    Deno.test(`molql - PyMOL operator: ${operator.name} (${example})`, () => {
      if (operator.isUnsupported) {
        assertThrows(() => pymol.transpile(example));
      } else {
        pymol.transpile(example);
      }
    });
  }
}
