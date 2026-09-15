# MolViewSpec TypeScript/Deno

A TypeScript implementation of [MolViewSpec](https://molstar.org/mol-view-spec/)..

## Modification Guidelines

This TS library aims to for closely replicate the code structure and functionality of a the
molviewspec python library features with a few differences that reflect the language differences.

1. camelCase vs snake_case
2. no named args in TS
3. no default args (can be addressed in future release)

We also use the same test structure, test data, and notebooks. So when we update this repo we should:

1. update the source code ( python and TS ).
2. update any test data ( common )
3. update tests (python and TS )
4. update Jupyter notebook examples ( notebooks vs. notebooks-ts)
5. bump the version and publish to pypi / JSR:

- pypi done
- TS: todo in a future PR.

## Quickstart

```sh
# requires deno and UV
deno jupyter --install 
uvx --from jupyter-core jupyter lab test-data/notebooks-ts/01_kras_structure_visualization.ipynb
```

## MolQL selectors

Import the canonical `molql` namespace to build base MolQL expressions. Selection-language transpilers use independent package entry points, so applications only include the parsers they import. The MVS state stores only the resulting JSON expression tree.

```typescript
import { createBuilder, molql } from "@molstar/molviewspec";
import * as pymol from "@molstar/molviewspec/molql/pymol";

const ligand = molql.struct.generator.atomGroups({
  "chain-test": molql.core.rel.eq([
    molql.struct.atomProperty.macromolecular.label_asym_id(),
    "G",
  ]),
});
const pocket = pymol.transpile("byres polymer within 5 of resn STI");

const builder = createBuilder();
const structure = builder
  .download({ url: "https://files.wwpdb.org/download/1iep.cif" })
  .parse({ format: "mmcif" })
  .assemblyStructure();

structure.component({ selector: molql.selector(ligand) });
structure.component({ selector: molql.selector(pocket) });
```

`molql.position(expression, structureRef?)` creates the corresponding wrapper for structure-aware primitive positions. Future selection-language transpilers can follow the same independent-subpath pattern without adding their parsers to the base MolQL bundle.

## Development

```bash
deno task test
deno task fmt
deno task lint
deno task check
```

## Citation

When using MolViewSpec, please cite:

- Adam Midlik, Sebastian Bittrich, Jennifer R Fleming, Sreenath Nair, Sameer Velankar, Stephen K Burley, Jasmine Y Young, Brinda Vallat, David Sehnal: MolViewSpec: a Mol* extension for describing and sharing molecular visualizations, Nucleic Acids Research, 2025; https://doi.org/10.1093/nar/gkaf370.

## Related Projects

- [MolViewSpec Python Library](https://github.com/molstar/mol-view-spec/tree/master/molviewspec)
- [Mol* Viewer](https://github.com/molstar/molstar) - Reference implementation
- [MolViewSpec Documentation](https://molstar.org/mol-view-spec-docs/)

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Version

This implementation follows MolViewSpec version 1.8.
