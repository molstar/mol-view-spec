# MolViewSpec shapes

Not every visual in a scene is a molecule or a density map. Segmentations from cryo-ET, surfaces
produced by an analysis pipeline, and meshes exported from a modelling tool all arrive as plain 3D
geometry files. MolViewSpec loads these through the `shape` node, which supports three formats:
VTK PolyData (`vtp`), `ply` and `obj`.

Before `shape` existed the only way to show such a mesh was to convert it offline into a
`primitives` node with inline `vertices` and `indices` arrays, which does not scale — a mesh with
25,000 vertices becomes several megabytes of JSON.

## Parsing a file

The flow matches volumetric data: `download`, `parse`, and then `shape` (comparable to `volume` or
`model_structure`). The format is given once, in the parse step.

```python
builder = create_builder()

builder.download(url="https://example.org/surface.vtp").parse(format="vtp").shape()
```

The `shape` node has no parameters of its own. Color is applied with a child `color` node, and
`opacity`, `clip`, `transform`, `instance` and `focus` attach to it in the usual way.

```python
(
    builder.download(url="https://example.org/surface.vtp")
    .parse(format="vtp")
    .shape()
    .color(color="#3b82f6")
    .opacity(opacity=0.8)
)
```

## Format-specific options

Some capabilities exist in only one of the three formats — a VTP carries named data arrays, a PLY
may store per-vertex colors, an OBJ groups faces by material. Rather than adding parameters to the
spec that are meaningful for one format and inert for the others, these travel as **custom
properties**, prefixed by the format they apply to.

### Coloring a VTP by a data array

A VTP can carry per-point and per-cell data arrays. `vtp_attribute` names the one to color by and
`vtp_attribute_source` says which of the two it is. A per-cell value is assigned to each vertex as
the arithmetic mean over all triangles incident to that vertex; vertices belonging to no triangle
take the value 0.

```python
(
    builder.download(url="https://example.org/capsid.vtp")
    .parse(format="vtp")
    .shape(
        custom={
            "vtp_attribute": "tile_id",
            "vtp_attribute_source": "cell",
            "vtp_palette": "turbo",
        }
    )
)
```

`vtp_palette` names the color list the values are mapped through. By default the scale spans the
minimum and maximum of the values in the file, which means two scenes built from different files
are not directly comparable. `vtp_domain` pins it:

```python
.shape(
    custom={
        "vtp_attribute": "tile_id",
        "vtp_attribute_source": "cell",
        "vtp_palette": "viridis",
        "vtp_domain": [0, 100],
    }
)
```

Only single-component (scalar) arrays are supported.

### Colors carried inside a PLY or OBJ

Both formats can store their own colors. `ply_coloring` and `obj_coloring` choose whether to use
them; the default in both cases is `uniform`, i.e. the color from the `color` child node.

```python
# PLY, using the per-vertex colors stored in the file
builder.download(url="https://example.org/scan.ply").parse(format="ply").shape(
    custom={"ply_coloring": "vertex"}
)
```

For OBJ, `custom` colors each material group individually. The material names come from the OBJ's
own `usemtl` directives, so no MTL file is involved. Materials that are not listed render grey.

```python
(
    builder.download(url="https://example.org/cell.obj")
    .parse(format="obj")
    .shape(
        custom={
            "obj_coloring": "custom",
            "obj_material_colors": {"membrane": "#ff3b30", "cytosol": "steelblue"},
        }
    )
)
```

## Reference

| custom property | applies to | values |
|---|---|---|
| `vtp_attribute` | VTP | name of the data array to color by |
| `vtp_attribute_source` | VTP | `point` or `cell` (default `point`) |
| `vtp_palette` | VTP | name of a color list, e.g. `viridis`, `turbo` (default `viridis`) |
| `vtp_domain` | VTP | `[min, max]` for the color scale (default: range of the values) |
| `ply_coloring` | PLY | `uniform`, `vertex` or `material` (default `uniform`) |
| `obj_coloring` | OBJ | `uniform`, `vertex` or `custom` (default `uniform`) |
| `obj_material_colors` | OBJ | `{ material name: color }`, used with `obj_coloring: "custom"` |

## Current limitations

- Only the polygons of a VTK PolyData file are rendered; `verts`, `lines` and `strips` are ignored.
- Multi-component VTP arrays (vectors) cannot be used for coloring.
- An OBJ's `.mtl` file is not read, so `obj_coloring: "given"` is unavailable. Material colors have
  to be supplied through `obj_material_colors`.
