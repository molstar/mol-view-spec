# MolQL selectors

[MolQL](https://molql.org/) is a composable query language for selecting atoms and residues. MolViewSpec supports serialized base MolQL expressions anywhere a component selector is accepted, including `component` and `color` nodes. MolQL expressions can also define positions for primitives such as distance measurements.

An MVS document stores a MolQL selector as JSON under a `molql` key. Selection-language text is transpiled while the state is created, so the viewer receives only the resulting expression tree:

```text
{
  "molql": <expression>
}
```

## Python

Import the canonical `molql` namespace to build a base-language expression. Named MolQL arguments retain their hyphenated spelling:

```python
from molviewspec import create_builder, molql

builder = create_builder()
structure = (
    builder.download(url="https://files.wwpdb.org/download/1iep.cif")
    .parse(format="mmcif")
    .assembly_structure()
)

ligand = molql.struct.generator.atom_groups({
    "chain-test": molql.core.rel.eq([
        molql.struct.atom_property.macromolecular.label_asym_id(),
        "G",
    ]),
})

structure.component(selector=molql.selector(ligand))
```

PyMOL selection text can be eagerly transpiled to the same base MolQL representation:

```python
pocket = molql.from_pymol("byres polymer within 5 of resn STI")
structure.component(selector=molql.selector(pocket))
```

The generic `molql.transpile(source, language="pymol")` entry point is also available. `molql.from_pymol` is preferable when the input language is known statically.

## TypeScript

The base-language builder is exported as `molql`. Transpilers use independent package entry points so applications only include parsers they import:

```typescript
import { createBuilder, molql } from "@molstar/molviewspec";
import * as pymol from "@molstar/molviewspec/molql/pymol";

const builder = createBuilder();
const structure = builder
  .download({ url: "https://files.wwpdb.org/download/1iep.cif" })
  .parse({ format: "mmcif" })
  .assemblyStructure();

const ligand = molql.struct.generator.atomGroups({
  "chain-test": molql.core.rel.eq([
    molql.struct.atomProperty.macromolecular.label_asym_id(),
    "G",
  ]),
});
const pocket = pymol.transpile("byres polymer within 5 of resn STI");

structure.component({ selector: molql.selector(ligand) });
structure.component({ selector: molql.selector(pocket) });
```

## Primitive positions

Use `molql.position` when an expression should resolve to a position for a primitive. A structure reference is optional and is useful when the state contains multiple structures:

### Python

```python
structure.primitives().distance(
    start=molql.position(ligand_atom),
    end=molql.position(protein_atom, structure_ref="protein"),
)
```

### TypeScript

```typescript
structure.primitives().distance({
  start: molql.position(ligandAtom),
  end: molql.position(proteinAtom, "protein"),
});
```

## Scope and validation

The libraries currently provide:

- The base MolQL `core` and `structure-query` languages.
- Typed programmatic expression builders.
- Eager PyMOL selection transpilation.
- Expression wrappers for selectors and primitive positions.

MolQL Script text parsing is not included. Programmatic queries use the base-language builder directly, and PyMOL text is converted when the MVS state is created. Invalid or unsupported expressions therefore fail before the state is sent to a viewer.

See the Python and TypeScript `08_molql.ipynb` notebooks in the repository for a complete example combining programmatic queries, PyMOL selections, selective coloring, and a distance measurement.
