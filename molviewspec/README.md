# MolViewSpec

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
          "url": "https://www.ebi.ac.uk/pdbe/entry-files/download/1cbs_updated.cif"
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

## The Tree Root

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

## The `root` Node

All nodes of the tree must define their `kind` and may have 0 or more child nodes (`children`).
The `root` is a special node with a `kind` of `root` that contains a collection of `children`.

```json
{
  "kind": "root",
  "children": []
}
```

## The `download` Node

Node types other than the `root` may contain an optional `params` property. A common action is loading of 3D structure
data. This is done using a node of `kind` `download`. In this context, `params` can for example provide the `url` from
which data will be loaded from.

```json
{
  "kind": "download",
  "children": [],
  "params": {
    "url": "https://www.ebi.ac.uk/pdbe/entry-files/download/1cbs_updated.cif"
  }
}
```

## The `parse` Node

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

## The `structure` Node

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

## The `component` Node

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

## The `representation` Node

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

## Expanding the Tree
Nodes can have 0 or more nodes as children. It is, for example, possible to create multiple `component` nodes based on a
particular `structure` node to create different representations for different types of molecules.

# Development

## Lint

```
make format
make mypy
```

## Publish the Python Library

- Set version (in https://github.com/molstar/mol-view-spec/blob/master/molviewspec/molviewspec/__init__.py)
- Create a GitHub release
- Tag will automatically publish to PyPI