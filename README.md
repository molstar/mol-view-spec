MolViewSpec
=============

### Setting up the environment

```
mamba env create -f ./environment.yaml
conda activate mol-view-spec-dev
```

### Running the server

```
cd molviewspec
python serve.py # or make serve
```

will run the server on `localhost:9000` with reload mode on.

- API Docs: `http://localhost:9000/docs`
- Example: `http://localhost:9000/api/v1/examples/load/1tqn` returns 

```json
{
  "kind": "root",
  "children": [
    {
      "kind": "download",
      "children": [
        {
          "kind": "parse",
          "children": [
            {
              "kind": "structure",
              "children": [
                {
                  "kind": "component",
                  "children": [
                    {
                      "kind": "representation",
                      "children": [],
                      "type": "cartoon",
                      "color": "red"
                    }
                  ],
                  "selector": "all"
                }
              ],
              "assembly_id": "1",
              "model_index": 1
            }
          ],
          "format": "mmcif",
          "is_binary": false
        }
      ],
      "url": "https://www.ebi.ac.uk/pdbe/entry-files/download/1abc_updated.cif"
    }
  ]
}
```