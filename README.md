MolViewSpec
=============

MolViewSpec (*.msvj) is a JSON-based file format that is used to describe visual scenes or views used in molecular 
visualization.
It adopts declarative data-driven approach to describe, load, render, and visually deliver molecular structures, along
with 3D representations, coloring schemes, and associated structural, biological, or functional annotations.
This Python toolkit allows for describing the information required for representing a molecular view state as data in a nested 
tree format that can be consumed by visualization software tools such as 
[Mol*](https://github.com/molstar/molstar/tree/master/src/extensions/mvs).


## The Idea behind MolViewSpec

In the long run, MolViewSpec aims to re-imagine how users define molecular scenes by detaching this process from any 
concrete 3D viewer.

MolViewSpec's workflow is:
1. `define scene using MolViewSpec`
2. `generic state description as .msvj`
3. `open in any MolViewSpec-compatible 3D viewer`

Opposed to the traditional workflow that locks users into using a specific 3D viewer, such as:
1. `define scene in Mol*`
2. `Mol*-specific state format`
3. `open only in Mol*`


## See the MolViewSpec in Action
Colab Notebook: https://colab.research.google.com/drive/1O2TldXlS01s-YgkD9gy87vWsfCBTYuz9


## Access Type Definitions
All type definitions can be found here:
- as openapi-schema.json: https://github.com/molstar/mol-view-spec/blob/master/docs/molviewspec-v1-openapi-schema.json
- in Markdown: https://github.com/molstar/mol-view-spec/blob/master/docs/MVS-tree-documentation.md
- using a dedicated Server endpoint: http://localhost:9000/api/v1/utils/models/openapi.json


## Description of the MolViewSpec State Tree
MolViewSpec provides a generic description of typical visual scenes that may occur as part of molecular visualizations.
A tree format allows the composition of complex scene descriptors by combining reoccurring nodes that serve as
building blocks.

Nodes can be nested to allow chaining of operations as child nodes will be applied to the result of the operation
described by its parent node.

The corresponding MolViewSpec tree is provided in JSON and may look like this:
```json
{
  "root": {
    "kind": "root",
    "children": [
      {
        "kind": "download",
        "params": {
          "url": "https://files.wwpdb.org/download/1cbs.cif"
        },
        "children": [
          {
            "kind": "parse",
            "params": {
              "format": "mmcif"
            },
            "children": [
              {
                "kind": "structure",
                "params": {
                  "type": "model"
                },
                "children": [
                  {
                    "kind": "component",
                    "params": {
                      "selector": "all"
                    },
                    "children": [
                      {
                        "kind": "representation",
                        "params": {
                          "type": "cartoon"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "metadata": {
    "version": "0.1",
    "timestamp": "2023-11-16T11:41:07.421220"
  }
}
```

Mol* is the reference implementation for reading MolViewSpec files.


### The Tree Root

Every tree starts with a single `root` node, which contains all nodes in a structure fashion, and a `metadata` node,
which can hold additional information such as a `version` tag as well as the `timestamp` when a view was created.

```json
{
  "root": {},
  "metadata": {
    "version": "0.1",
    "timestamp": "2023-11-16T11:41:07.421220"
  }
}
```


### The `root` Node

All nodes of the tree must define their `kind` and may have 0 or more child nodes (`children`).
The `root` is a special node with a `kind` of `root` that contains a collection of `children`.

```json
{
  "kind": "root",
  "children": []
}
```


### The `download` Node

Node types other than the `root` may contain an optional `params` property. A common action is loading of 3D structure
data. This is done using a node of `kind` `download`. In this context, `params` can for example provide the `url` from
which data will be loaded from.

```json
{
  "kind": "download",
  "children": [],
  "params": {
    "url": "https://files.wwpdb.org/download/1cbs.cif"
  }
}
```


### The `parse` Node

The previous `download` operation merely obtains the resources from the specified URL. To make it available to the
viewer, the data must be parsed. This operation expects that the `format` is defined (in this case mmCIF is parsed).

```json
{
  "kind": "parse",
  "children": [],
  "params": {
    "format": "mmcif"
  }
}
```


### The `structure` Node

There are different ways to load the content of a mmCIF file. Common actions are loading the 1st biological assembly or
loading the deposited coordinates (also called "asymmetric unit" or "model coordinates").
The action is defined as `kind`. In this example, the `model` coordinates are loaded.

```json
{
  "kind": "structure",
  "children": [],
  "params": {
    "kind": "model"
  }
}
```


### The `component` Node

At this point, the loaded file is available in the viewer but nothing is visualized yet. Several selection (called
"components") can be created. The example creates a component that includes everything using a `selector` set to `all`.
Other options could be a selection for protein chains, nucleic acids, ligands etc.
Components are reusable groups of atoms, residues, or chains, which can be interacted with programmatically.

```json
{
  "kind": "component",
  "children": [],
  "params": {
    "selector": "all"
  }
}
```


### The `representation` Node

The `representation` nodes applies to previously created components, which is provided by the parent node of a
`representation` node. Representations are dedicated visuals that constitute a component. In this example, the selection
from above -- which selects the entire structure -- and depicts it as cartoon by specifying `cartoon` as `type`.

```json
{
    "kind": "representation",
    "params": {
      "type": "cartoon"
    }
}
```


### Expanding the Tree
Nodes can have 0 or more nodes as children. It is, for example, possible to create multiple `component` nodes based on a
particular `structure` node to create different representations for different types of molecules.


### Development

### Install from PyPI
```shell
pip install molviewspec
```

Find the package at: https://pypi.org/project/molviewspec/

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
- Example: `http://localhost:9000/api/v1/examples/load?id=1tqn`

### Formatting the Project

```
make format
make mypy
```

### Publishing the Python Library

- Set version (in https://github.com/molstar/mol-view-spec/blob/master/molviewspec/molviewspec/__init__.py)
- Create a GitHub release
- Tag will automatically publish to PyPI


## Mol* Extension 

MolViewSpec is supported in Mol* via an [official extension](https://github.com/molstar/molstar/tree/master/src/extensions/mvs).