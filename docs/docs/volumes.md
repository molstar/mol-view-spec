# MolViewSpec volumes

Electron density data from MX and EM experiments is invaluable when interrogating molecular structures. MolViewSpec 
allows you to add density data to a scene by parsing a dedicated file or by querying the Mol* Volume Server (PDBe: 
https://www.ebi.ac.uk/pdbe/densities/ - RCSB PDB: https://maps.rcsb.org/) for this data when working with PDB entries.

## Parsing a file

Volumetric data has a similar flow as the loading of standard molecular mmCIF data: `download`, `parse`, and `volume` 
(comparable to `model_structure` or `assembly_structure`).

Specify the format as part of the parse step.

```python
builder = create_builder()

download = builder.download(url="https://www.ebi.ac.uk/pdbe/entry-files/1tqn.ccp4")
volume = download.parse(format="map").volume()
```

Analogous to standard molecular data, dedicated and customizable representations can now be added. In this case 
`isosurface`. `relative_isovalue` or `absolute_isovalue` adjust, which parts of the data are shown. `show_wireframe` and
`show_faces` provide options for finer-grained customization. Define colors and transparency as usual.

```python
(
    volume.representation(type="isosurface", relative_isovalue=1, show_wireframe=True)
    .color(color="blue")
    .opacity(opacity=0.66)
)
```

## Querying Mol* Volume Server

Density data is particularly useful when combined with 3D structure data.

Create a view of 1tqn, which represents the ligand as ball-and-stick and focuses on it.

```python
builder = create_builder()

structure = builder.download(url=_url_for_mmcif("1tqn")).parse(format="mmcif").model_structure()
structure.component(selector="polymer").representation(type="cartoon").color(color="white")
ligand = structure.component(selector="ligand")
ligand.representation(type="ball_and_stick").color(custom={"molstar_color_theme_name": "element-symbol"})
ligand.focus(up=[0.98, -0.19, 0], direction=[-28.47, -17.66, -16.32], radius=14, radius_extent=5)
```

Enrich this view with density data, provided by [PDBe's Volume Server](https://www.ebi.ac.uk/pdbe/densities/).

```python
volume_data = builder.download(
    url="https://www.ebi.ac.uk/pdbe/densities/x-ray/1tqn/box/-22.367,-33.367,-21.634/-7.106,-10.042,-0.937?detail=3"
).parse(format="bcif")
```

With this data at hand, dedicated channels can be created that visualize the electron density.

```python
volume_data.volume(channel_id="2FO-FC").representation(
    type="isosurface",
    relative_isovalue=1.5,
    show_wireframe=True,
    show_faces=False,
).color(color="blue").opacity(opacity=0.3)

fo_fc = volume_data.volume(channel_id="FO-FC")
fo_fc.representation(type="isosurface", relative_isovalue=3, show_wireframe=True).color(color="green").opacity(
    opacity=0.3
)
fo_fc.representation(type="isosurface", relative_isovalue=-3, show_wireframe=True).color(color="red").opacity(
    opacity=0.3
)
```

![Volume](./files/volume.png 'Volume')