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
