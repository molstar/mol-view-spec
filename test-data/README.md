# Example Annotations

- Each folder is supposed to represent a single entry with annotations
  - `molecule.cif` should be present with the source molecule
- Annotations can be either in:
  - CIF format, a separate `annotations.cif` file WITHOUT the `data_` header (it gets added on the fly)
  - JSON format, a single file for each annotation

## Endpoints

- `/api/v1/examples/data/{id}/molecule` Returns CIF file with `molecule.cif`
- `/api/v1/examples/data/{id}/cif-annotations` Returns CIF file with `annotations.cif`, includes `data_{id}_annotations` to the top
- `/api/v1/examples/data/{id}/molecule-and-cif-annotations` Return a concatenation of `molecule.cif` and `annotations.cif`
- `/api/v1/examples/data/{id}/json-annotations` Lists all `.json` file names in the folder
- `/api/v1/examples/data/{id}/json/{name}` Returns `{name}.json` from the given folder