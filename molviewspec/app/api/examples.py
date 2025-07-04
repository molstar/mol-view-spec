"""
A collection of MolViewSpec examples that showcase common visualization tasks that can be addressed using the builder.
"""

import itertools
import math
from typing import Literal, Mapping, TypeAlias, Union

import requests
from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response

from app.config import settings
from molviewspec.builder import Representation, create_builder
from molviewspec.nodes import (
    MVSJ,
    CategoricalPalette,
    ComponentExpression,
    ContinuousPalette,
    DiscretePalette,
    GlobalMetadata,
    PrimitiveComponentExpressions,
    RepresentationTypeT,
    Snapshot,
    States,
)

MVSResponse: TypeAlias = Response
"""Response containing a MVS tree (as JSON)"""


router = APIRouter()


@router.get("/load")
async def download_example(id: str = "1cbs") -> MVSResponse:
    """
    Download a minimal example that visualizes a given PDB entry in cartoon representation.
    """
    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif(id))
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation()
        .color(color="blue")
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/label")
async def label_example(id: str = "1lap") -> MVSResponse:
    """
    The minimal example enriched by custom labels and labels read from the CIF source file.
    """
    builder = create_builder()
    structure = builder.download(url=_url_for_mmcif(id)).parse(format="mmcif").model_structure()

    # Reference a residue of interest
    residue = ComponentExpression(label_asym_id="A", label_seq_id=120)

    # Represent everything as cartoon & color the residue red
    whole = structure.component()
    (whole.representation().color(color="red", selector=ComponentExpression(label_asym_id="A", label_seq_id=120)))

    # label the residues with custom text & focus it (i.e., position camera)
    # leverage vendor-specific properties to request non-covalent interactions in Mol*
    structure.component(
        selector=residue,
        custom={"molstar_show_non_covalent_interactions": True, "molstar_non_covalent_interactions_radius_ang": 5.0},
    ).label(text="ALA 120 A: My Label").focus()

    # structure.label_from_source(schema="residue", category_name="my_custom_cif_category")

    return JSONResponse(builder.get_state().to_dict())


@router.get("/color")
async def color_example(id: str = "1cbs") -> MVSResponse:
    """
    An example with different representations and coloring for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure = builder.download(url=_url_for_mmcif(id)).parse(format="mmcif").model_structure()

    structure.component(selector="protein").representation(type="cartoon").color(color="white")

    active_site = structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=64))
    active_site.representation(type="ball_and_stick").color(color="red")
    active_site.tooltip(text="Active Site")

    structure.component(selector="ligand").representation(type="ball_and_stick").color_from_source(
        schema="residue", category_name="my_custom_cif_category"
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/component")
async def component_example() -> MVSResponse:
    """
    Define components by referencing selection expression from a URL. This will select the protein chain A and render it
    in cartoon representation and select the REA ligand in chain B, which will be depicted in ball_and_stick
    representation.
    """
    builder = create_builder()
    structure = builder.download(url=_url_for_mmcif("1cbs")).parse(format="mmcif").model_structure()

    structure.component_from_uri(
        schema="chain", uri=f"/data/1cbs/components.cif", format="cif", category_name="mvs_test_component1"
    ).representation(type="cartoon").color(color="blue")
    structure.component_from_uri(
        schema="chain", uri=f"/data/1cbs/components.cif", format="cif", category_name="mvs_test_component2"
    ).representation(type="ball_and_stick").color(color="yellow")

    return JSONResponse(builder.get_state().to_dict())


@router.get("/symmetry-mates")
async def symmetry_mates_example(id: str = "1cbs") -> MVSResponse:
    """
    Add symmetry mates within a distance threshold.
    """
    builder = create_builder()
    (builder.download(url=_url_for_mmcif(id)).parse(format="mmcif").symmetry_mates_structure(radius=5.0))
    return JSONResponse(builder.get_state().to_dict())


@router.get("/symmetry")
async def symmetry_example(id: str = "1tqn") -> MVSResponse:
    """
    Create symmetry mates by specifying Miller indices.
    """
    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif(id))
        .parse(format="mmcif")
        .symmetry_structure(ijk_min=(-1, -1, -1), ijk_max=(1, 1, 1))
        .component()
        .representation()
        .color(color="#008080")
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/transform")
async def transform_example() -> MVSResponse:
    """
    Superimpose 4hhb and 1oj6 by transforming the latter.
    """
    builder = create_builder()

    # Load first structure and color it red
    (
        builder.download(url=_url_for_mmcif("4hhb"))
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation()
        .color(color="red")
    )

    # Load second structure, apply matrix transform, and color it blue
    (
        builder.download(url=_url_for_mmcif("1oj6"))
        .parse(format="mmcif")
        .model_structure()
        .transform(
            rotation=(
                -0.7202161,
                -0.33009904,
                -0.61018308,
                0.36257631,
                0.57075962,
                -0.73673053,
                0.59146191,
                -0.75184312,
                -0.29138417,
            ),
            translation=(-12.54, 46.79, 94.50),
        )
        .component()
        .representation()
        .color(color="blue")
    )

    return JSONResponse(builder.get_state().to_dict())


@router.get("/validation")
async def validation_example(id: str = "1cbs") -> MVSResponse:
    """
    Color a structure by annotation data in JSON.
    :param id: the entry to process
    :return: view spec of a structure that will color residues depending on the number of validation report issues
    """
    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif(id))
        .parse(format="mmcif")
        .assembly_structure()
        .component()
        .representation()
        .color(color="#ffffff")
        .color_from_uri(schema="residue", uri=f"/data/{id.lower()}/validation", format="json")
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/description")
async def description_example(id: str = "1cbs") -> MVSResponse:
    """
    Download a minimal example that visualizes a given PDB entry in cartoon representation.
    """
    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif(id))
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation()
        .color(color="blue")
    )
    return JSONResponse(
        builder.get_state(
            title="Metadata Example",
            description="My Custom State",
            description_format="markdown",
        ).to_dict()
    )


@router.get("/multiple-states")
async def multiple_states() -> MVSResponse:
    """
    Use a custom template to define a collection of related states.
    :return: view spec that combines multiple individual snapshots
    """
    ids = ["1tqn", "4hhb", "1exr"]
    representations: list[RepresentationTypeT] = ["cartoon", "ball_and_stick"]
    snapshots = [
        _multistate_template(key=str(index), url=_url_for_mmcif(id), repr=repr)
        for index, (id, repr) in enumerate(itertools.product(ids, representations))
    ]
    metadata = GlobalMetadata(description="test")
    return PlainTextResponse(States(snapshots=snapshots, metadata=metadata).dumps(indent=2))


def _multistate_template(key: str, url: str, repr: RepresentationTypeT) -> Snapshot:
    """
    Helper function that demonstrates how to define a "template" that can define states using a number of variables.
    :param key: custom key to assign
    :param url: source of structure data
    :param repr: the desired representation
    :return: all variables wrapped into a state
    """
    template = create_builder()
    template.download(url=url).parse(format="mmcif").assembly_structure().component().representation(type=repr)
    return template.get_snapshot(key=key)


@router.get("/multiple-states-alignment")
async def multiple_states_alignment() -> MVSResponse:
    """Example of multi-state using `camera` node"""
    snapshots = [
        make_snapshot(
            key="A",
            description="### We have these two proteins...",
            align=False,
            duration=3000,
            transition_duration=1000,
            camera=camera2,
        ),
        make_snapshot(
            key="B",
            description="### What if we superpose them?",
            duration=3000,
            transition_duration=1500,
            camera=camera1,
        ),
        make_snapshot(
            key="C", description="### Look, a ligand!", duration=500, transition_duration=3000, camera=camera_ligand1
        ),
        make_snapshot(
            key="D", description="### ... a nice one...", duration=1000, transition_duration=1000, camera=camera_ligand2
        ),
        make_snapshot(key="E", description="", duration=2000, camera=camera1),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="F", description="# Party!!!", duration=250, camera=camera1, show=["protein2", "ligand2"]),
        make_snapshot(key="G", description="# Party!!!", duration=250, camera=camera1, show=["protein1", "ligand2"]),
        make_snapshot(key="H", description="", duration=500, transition_duration=10_000, camera=camera1),
        make_snapshot(
            key="I", description="### Thanks for watching", duration=10_000, transition_duration=1000, camera=camera_far
        ),
    ]
    metadata = GlobalMetadata(description="test")
    return PlainTextResponse(States(snapshots=snapshots, metadata=metadata).dumps(indent=2))


@router.get("/multiple-states-alignment-focus")
async def multiple_states_alignment_focus() -> MVSResponse:
    """Example of multi-state using `focus` node"""

    index = """
- [Superposition](#B)
- [Ligand](#C)
- [Party](#F0)
- [End](#I)"""

    snapshots = [
        make_snapshot(
            key="A",
            description=f"### We have these two proteins...{index}",
            align=False,
            duration=3000,
            transition_duration=1000,
            focus="protein",
            orient=orient1,
        ),
        make_snapshot(
            key="B",
            description=f"### What if we superpose them? {index}",
            duration=3000,
            transition_duration=1500,
            focus="root",
            orient=orient1,
        ),
        make_snapshot(
            key="C",
            description=f"### Look, a ligand! {index}",
            duration=500,
            transition_duration=3000,
            focus="ligand",
            orient=orient1,
        ),
        make_snapshot(
            key="D",
            description=f"### ... a nice one... {index}",
            duration=1000,
            transition_duration=1000,
            focus="ligand",
            orient=orient2,
        ),
        make_snapshot(key="E", description=f"### What now? {index}", duration=2000, focus="protein", orient=orient1),
        *itertools.chain(
            *[
                [
                    make_snapshot(
                        key=f"F{i}",
                        description=f"### Party 1!!! {index}",
                        duration=250,
                        focus="protein",
                        orient=orient1,
                        show=["protein2", "ligand2"],
                    ),
                    make_snapshot(
                        key=f"G{i}",
                        description=f"### Party 2!!! {index}",
                        duration=250,
                        focus="protein",
                        orient=orient1,
                        show=["protein1", "ligand2"],
                    ),
                ]
                for i in range(2)
            ]
        ),
        make_snapshot(
            key="H",
            description=f"### Almost there... {index}",
            duration=500,
            transition_duration=10_000,
            focus="protein",
            orient=orient1,
        ),
        make_snapshot(
            key="I",
            description="### Thanks for watching\n[Go to start](#A)",
            duration=10_000,
            transition_duration=1000,
            camera=camera_far,
        ),
    ]
    metadata = GlobalMetadata(description="test")
    return PlainTextResponse(States(snapshots=snapshots, metadata=metadata).dumps(indent=2))


camera1 = {
    "target": (49.825582, -1.340038, 26.471059),
    "position": (-4.449025, 31.275798, 17.857061),
    "up": (-0.177081405072997, -0.0349061499228514, 0.9835770110545166),
}
camera2 = {
    "target": (26.130746420193915, 4.620393357559111, 42.794555467590406),
    "position": (-66.53446639, 60.30671798, 28.08753128),
    "up": (-0.177081405072997, -0.0349061499228514, 0.9835770110545166),
}
camera_ligand1 = {
    "target": (46.92617916263649, 8.778192057663661, 26.526291795071554),
    "position": (33.33715295823857, 16.944394902436812, 24.3695586372132),
    "up": (-0.177081405072997, -0.03490614992285142, 0.9835770110545164),
}
camera_ligand2 = {
    "target": (46.92617916263649, 8.778192057663661, 26.526291795071554),
    "position": (36.05968917375933, -0.6721174788261575, 33.498453940787826),
    "up": (0.5701116198257888, -0.050566846964212424, 0.8200095944119795),
}
camera_far = {
    "target": (49.825582, -1.340038, 26.471059),
    "position": (-191.11654336839834, 143.45196107439443, -11.769199212079403),
    "up": (-0.17708140507299697, -0.03490614992285138, 0.9835770110545166),
}
orient1 = {
    "direction": (0.84931414, -0.51038768, 0.13479582),
    "up": (-0.177081405072997, -0.0349061499228514, 0.9835770110545166),
}
orient2 = {
    "direction": (0.67915562, 0.59064435, -0.43576013),
    "up": (0.5701116198257888, -0.050566846964212424, 0.8200095944119795),
}


def make_snapshot(
    *,
    key: str,
    description: str | None = None,
    align: bool = True,
    duration: int,
    transition_duration: int | None = None,
    color1: str = "#dddddd",
    color2: str = "#4fc64f",
    camera=None,
    focus: Literal["protein", "ligand", "root", None] = None,
    orient=orient1,
    show: list[str] | None = None,
) -> Snapshot:
    builder = create_builder()

    if focus == "root":
        builder.focus(**orient)

    structure1 = (
        builder.download(url="https://files.wwpdb.org/download/2e2n.cif").parse(format="mmcif").model_structure()
    )
    if show is None or "protein1" in show:
        protein1 = structure1.component(selector=ComponentExpression(label_asym_id="A"))
        protein1.representation(type="cartoon").color(color=color1)
        if focus == "protein":
            protein1.focus(**orient)

    structure2 = (
        builder.download(url="https://files.wwpdb.org/download/2e2o.cif").parse(format="mmcif").model_structure()
    )
    if align:
        structure2 = structure2.transform(
            rotation=[
                0.291445,
                0.949818,
                0.113601,
                -0.479952,
                0.042465,
                0.876266,
                0.827469,
                -0.309906,
                0.468243,
            ],
            translation=[2.237313, 17.994696, -4.031342],
        )

    if show is None or "protein2" in show:
        protein2 = structure2.component(selector=ComponentExpression(label_asym_id="A"))
        protein2.representation(type="cartoon").color(color=color2)
        if focus == "protein":
            protein2.focus(**orient)
    if show is None or "ligand2" in show:
        ligand2 = structure2.component(selector=ComponentExpression(label_asym_id="B"))
        ligand2.representation(type="ball_and_stick").color(color=color2).color(
            color="red", selector=ComponentExpression(type_symbol="O")
        )
        if focus == "ligand":
            ligand2.focus(**orient, radius_factor=1.5, radius_extent=2)

    if camera is not None:
        builder.camera(**camera)

    return builder.get_snapshot(
        key=key,
        title=f"State {key}",
        description=description,
        linger_duration_ms=duration,
        transition_duration_ms=transition_duration,
    )


@router.get("/custom-properties")
async def custom_properties_example() -> MVSResponse:
    """
    MolViewSpec accepts typed parameters depending on the current node type. Additionally, arbitrary information can be
    attached to each node using an optional `custom` parameter. Data must be provided as dict.
    Nonetheless, this information will propagate and be added to the final JSON, allowing users to build custom
    functionality independent of the official schema defined by MolViewSpec.
    """
    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif("4hhb"))
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation(type="cartoon", custom={"a": "hello"})
        .color(selector="protein", color="#0000ff", custom={"b": "ciao"})
        .color(selector="ligand", color="#ff0000")
        .color(color="#555555", custom={"c": "salut"})
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/refs")
async def refs_example() -> MVSResponse:
    """
    MolViewSpec allows assigning string references to nodes that allow referencing them
    from various parts of the tree later, for example when building primitive shapes.
    """
    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif("4hhb"))
        .parse(format="mmcif")
        .model_structure(ref="structure")
        .component()
        .representation(type="cartoon")
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/repr-params")
async def repr_params_example() -> MVSResponse:
    """
    Individual representations (cartoon, ball-and-stick, surface) can be further customized. The corresponding builder
    function exposes additional method arguments depending on the chosen representation type.
    """
    builder = create_builder()
    component = (
        builder.download(url=_url_for_mmcif("1a23")).parse(format="mmcif").model_structure(ref="structure").component()
    )
    component.representation(type="cartoon", size_factor=1.5, tubular_helices=True)
    component.representation(type="surface", ignore_hydrogens=True).opacity(opacity=0.8)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/membrane-orientation-3sn6")
async def membrane_orientation_example_3sn6() -> MVSResponse:
    """
    MolViewSpec supports primitives (i.e. simple geometric shapes likes circles). These can e.g. be used to visualize
    the location of the phospholipid bilayer of membrane proteins. This assumes that you know these boundaries. Mol*
    can predict them, and you can obtain these results using its Membrane Server CLI entry point. Start the server
    using: `node lib/commonjs/servers/membrane-orientation/server.js`. By default, it will listen on port 1340. A
    simple prediction looks like this: `http://localhost:1340/MembraneServer/predict/3sn6/?assemblyId=1`. Change the
    entry_id as needed. The server will respond with JSON, describing key values needed to draw both membrane
    primitives.
    """
    server_response = {
        "planePoint1": [27.6286077232155, 10.3137003539375, 17.3841276600337],
        "planePoint2": [24.2923627786858, 13.70617189513, -17.3918785297573],
        "normalVector": [0.0950497135193607, -0.096651610860181, 0.99076940711652],
        "centroid": [25.9604852509506, 12.0099361245337, -0.00387543486177577],
        "radius": 29.8063842867283,
    }

    normal = _normalize(server_response["normalVector"])
    reference = [1, 0, 0] if abs(_dot(normal, [1, 0, 0])) < 0.9 else [0, 1, 0]
    major_axis = _normalize(_cross(normal, reference))
    minor_axis = _normalize(_cross(normal, major_axis))

    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif("3sn6"))
        .parse(format="mmcif")
        .assembly_structure(assembly_id="1")
        .component()
        .representation(type="cartoon")
        # must provide an arbitrary color to set custom properties
        .color(color="white", custom={"molstar_use_default_coloring": True})
    )
    (
        builder.primitives(tooltip="Membrane Layer", opacity=0.66)
        .ellipse(
            center=server_response["planePoint1"],  # type: ignore
            major_axis=major_axis,  # type: ignore
            minor_axis=minor_axis,  # type: ignore
            radius_major=server_response["radius"],  # type: ignore
            as_circle=True,
            tooltip="Inner Membrane",
        )
        .ellipse(
            center=server_response["planePoint2"],  # type: ignore
            major_axis=major_axis,  # type: ignore
            minor_axis=minor_axis,  # type: ignore
            radius_major=server_response["radius"],  # type: ignore
            as_circle=True,
            tooltip="Outer Membrane",
        )
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/membrane-orientation-1brr")
async def membrane_orientation_example_1brr() -> MVSResponse:
    """
    See the first membrane orientation for details. This serves as another test case.
    """
    server_response = {
        "planePoint1": [10.3229835520205, -0.419982206460674, 2.10628676167936],
        "planePoint2": [32.6548111099097, -0.359466197860531, 17.8090195091152],
        "normalVector": [-0.818015661461147, -0.00221670361172687, -0.575191675730256],
        "centroid": [21.4888973309651, -0.389724202160602, 9.9576531353973],
        "radius": 32.3792382267291,
    }

    normal = _normalize(server_response["normalVector"])
    reference = [1, 0, 0] if abs(_dot(normal, [1, 0, 0])) < 0.9 else [0, 1, 0]
    major_axis = _normalize(_cross(normal, reference))
    minor_axis = _normalize(_cross(normal, major_axis))

    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif("1brr"))
        .parse(format="mmcif")
        .assembly_structure(assembly_id="1")
        .component()
        .representation(type="cartoon")
        # must provide an arbitrary color to set custom properties
        .color(color="white", custom={"molstar_use_default_coloring": True})
    )
    (
        builder.primitives(tooltip="Membrane Layer", opacity=0.66)
        .ellipse(
            center=server_response["planePoint1"],  # type: ignore
            major_axis=major_axis,  # type: ignore
            minor_axis=minor_axis,  # type: ignore
            radius_major=server_response["radius"],  # type: ignore
            as_circle=True,
            tooltip="Outer Membrane",
        )
        .ellipse(
            center=server_response["planePoint2"],  # type: ignore
            major_axis=major_axis,  # type: ignore
            minor_axis=minor_axis,  # type: ignore
            radius_major=server_response["radius"],  # type: ignore
            as_circle=True,
            tooltip="Inner Membrane",
        )
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/primitives/cube")
async def primitives_cube_example() -> MVSResponse:
    """
    Draws a cube and axis labels.
    """
    builder = create_builder()
    builder.primitives(tooltip="Primitives", color="magenta").mesh(
        vertices=[
            0.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            1.0,
            1.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0,
            1.0,
            1.0,
            1.0,
            0.0,
            1.0,
            1.0,
        ],
        indices=[
            # bottom
            0,
            2,
            1,
            0,
            3,
            2,
            # top
            4,
            5,
            6,
            4,
            6,
            7,
            # front
            0,
            1,
            5,
            0,
            5,
            4,
            # back
            2,
            3,
            7,
            2,
            7,
            6,
            # left
            0,
            7,
            3,
            0,
            4,
            7,
            # right
            1,
            2,
            6,
            1,
            6,
            5,
        ],
        triangle_groups=[0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
        group_colors={
            0: "red",
            1: "green",
            2: "blue",
            3: "yellow",
            4: "cyan",
        },  # Let group 5 fall back to parent color (magenta)
        # # Optionally, use implicit grouping and color triangles individually:
        # triangle_groups=None,
        # group_colors={0: "red", 1: "red", 2: "green", 3: "green", 4: "blue", 5: "blue", 6: "yellow", 7: "yellow", 8: "cyan", 9: "cyan"},
        group_tooltips={
            0: "### Side\nbottom",
            1: "### Side\ntop",
            2: "### Side\nfront",
            3: "### Side\nback",
            4: "### Side\nleft",
            # 5: "### Side\nright",
        },
        tooltip="Cube",
        show_wireframe=True,
        wireframe_width=2,
        wireframe_color="black",
    )
    # let's throw in some lines that intersect each face in the middle
    (
        builder.primitives(
            color="blue",
            label_color="blue",
            tooltip="Generic Axis",
            opacity=0.5,
            label_opacity=0.6,
        )
        # chain primitives to create desired visuals
        .tube(start=(-0.5, 0.5, 0.5), end=(1.5, 0.5, 0.5), radius=0.05, color="red", tooltip="### Axis\nX")
        .label(position=(-0.5, 0.5, 0.5), text="X", label_size=0.33, label_color="red")
        .tube(start=(0.5, -0.5, 0.5), end=(0.5, 1.5, 0.5), radius=0.05, color="green", tooltip="### Axis\nY")
        .label(position=(0.5, -0.5, 0.5), text="Y", label_size=0.33, label_color="green")
        .tube(start=(0.5, 0.5, -0.5), end=(0.5, 0.5, 1.5), radius=0.05)
        .label(position=(0.5, 0.5, -0.5), text="Z", label_size=0.33)
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/primitives/lines")
async def primitives_lines_example() -> MVSResponse:
    """
    Draws a square and a wiggly line
    """
    builder = create_builder()
    primitives = builder.primitives(color="magenta", tooltip="Primitives")
    primitives.lines(
        vertices=[0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
        indices=[0, 1, 1, 2, 2, 3, 3, 0],
        group_colors={0: "red", 1: "green", 2: "blue", 3: "black"},
        width=1.5,
        tooltip="Square",
    )
    primitives.lines(
        vertices=[
            -0.3,
            0.3,
            -1.0,
            0.1,
            0.7,
            -0.5,
            0.5,
            0.3,
            0.0,
            0.9,
            0.7,
            0.5,
            1.3,
            0.3,
            1.0,
        ],
        indices=[0, 1, 1, 2, 2, 3, 3, 4],
        line_groups=[0, 0, 1, 1],
        group_colors={0: "cyan"},  # Let group 1 fall back to "brown"
        color="brown",
        width=3,
        tooltip="Snake",
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/primitives/structure")
async def primitives_structure_example() -> MVSResponse:
    """
    Shows a structure with distance measurement between two ligands.
    """
    builder = create_builder()
    structure = builder.download(url=_url_for_mmcif("1tqn")).parse(format="mmcif").model_structure()
    (structure.component(selector="polymer").representation().color(color="blue"))
    (
        structure.component(selector=[ComponentExpression(auth_seq_id=258), ComponentExpression(auth_seq_id=508)])
        .representation(type="ball_and_stick")
        .color(color="green")
    )
    (
        structure.primitives()
        .distance(
            start=ComponentExpression(auth_seq_id=258),
            end=ComponentExpression(auth_seq_id=508),
            color="red",
            radius=0.1,
            dash_length=0.1,
            label_template="Distance: {{distance}}",
            label_color="red",
        )
        .focus()
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/primitives/multi-structure")
async def primitives_multi_structure_example() -> MVSResponse:
    """
    Two structures and distance measurement between them
    """
    builder = create_builder()
    _1tqn = builder.download(url=_url_for_mmcif("1tqn")).parse(format="mmcif").model_structure(ref="X")
    _1tqn.component(selector="polymer").representation().color(color="blue")
    (
        _1tqn.component(selector=ComponentExpression(auth_seq_id=508))
        .representation(type="ball_and_stick")
        .color(color="green")
    )

    _1cbs = builder.download(url=_url_for_mmcif("1cbs")).parse(format="mmcif").model_structure(ref="Y")
    _1cbs.component(selector="polymer").representation().color(color="blue")
    (
        _1cbs.component(selector=ComponentExpression(auth_seq_id=200))
        .representation(type="ball_and_stick")
        .color(color="green")
    )
    (
        builder.primitives().distance(
            start=PrimitiveComponentExpressions(structure_ref="X", expressions=[ComponentExpression(auth_seq_id=508)]),
            end=PrimitiveComponentExpressions(structure_ref="Y", expressions=[ComponentExpression(auth_seq_id=200)]),
            color="purple",
            radius=1,
            dash_length=1,
            label_template="Ligand Distance: {{distance}}",
            label_color="red",
        )
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/primitives/ellipse")
async def primitives_ellipse_example() -> MVSResponse:
    """
    Draws ellipse and arrows wrapped in an ellipsoid
    """
    builder = create_builder()
    (
        builder.primitives(opacity=0.66)
        .ellipse(
            color="red",
            center=(1, 1, 1),
            major_axis=(1.5, 0, 0),
            minor_axis=(0, 2, 0),
            theta_start=0,
            theta_end=math.pi / 2,
            tooltip="XY",
        )
        .ellipse(
            color="green",
            center=(1, 1, 1),
            major_axis_endpoint=(1.5 + 1, 0 + 1, 0 + 1),
            minor_axis_endpoint=(0 + 1, 0 + 1, 1 + 1),
            theta_start=0,
            theta_end=math.pi / 2,
            tooltip="XZ",
        )
        .ellipse(
            color="blue",
            center=(1, 1, 1),
            major_axis=(0, 10, 0),
            minor_axis=(0, 0, 1),
            radius_major=2,
            radius_minor=1,
            theta_start=0,
            theta_end=math.pi / 2,
            tooltip="YZ",
        )
        .arrow(
            start=(1, 1, 1),
            end=(1 + 1.5, 1 + 0, 1 + 0),
            tube_radius=0.05,
            length=1.5 + 0.2,
            show_end_cap=True,
            color="#ffff00",
            tooltip="X",
        )
        .arrow(
            start=(1, 1, 1),
            direction=(0, 2 + 0.2, 0),
            tube_radius=0.05,
            show_end_cap=True,
            color="#ff00ff",
            tooltip="Y",
        )
        .arrow(
            end=(1, 1, 1),
            start=(1 + 0, 1 + 0, 1 + 1 + 0.2),
            show_start_cap=True,
            tube_radius=0.05,
            color="#00ffff",
            tooltip="Z",
        )
    )

    (
        builder.primitives(opacity=0.33).ellipsoid(
            center=(1, 1, 1),
            major_axis=(1, 0, 0),
            minor_axis=(0, 1, 0),
            radius=(1.5, 2, 1),
            color="#cccccc",
        )
    )

    return JSONResponse(builder.get_state().to_dict())


@router.get("/ihm/basic-restraints")
async def ihm_basic_restraints_example() -> MVSResponse:
    """
    Loads an I/HM structure and renders restraints as tube primitives
    """
    builder = create_builder()
    structure = builder.download(url="https://pdb-ihm.org/cif/8zz1.cif").parse(format="mmcif").model_structure()

    structure.component(selector="coarse").representation(type="spacefill").color(
        custom={"molstar_use_default_coloring": True}
    )
    structure.component(selector="polymer").representation(type="cartoon").color(
        custom={"molstar_use_default_coloring": True}
    )

    # Extracted manually from ihm_cross_link_restraint category of 8zz1.cif
    RESTRAINTS = [
        ["3", "C", 17, "3", "C", 412],
        ["3", "C", 17, "3", "C", 735],
        ["3", "C", 206, "3", "C", 217],
        ["3", "C", 384, "3", "C", 362],
        ["3", "C", 400, "3", "C", 530],
        # ...
    ]

    primitives = structure.primitives()
    for e1, a1, s1, e2, a2, s2 in RESTRAINTS:
        primitives.tube(
            start=ComponentExpression(label_entity_id=e1, label_asym_id=a1, label_seq_id=s1),
            end=ComponentExpression(label_entity_id=e2, label_asym_id=a2, label_seq_id=s2),
            color="red",
            radius=1,
            dash_length=1,
        )

    return JSONResponse(builder.get_state().to_dict())


@router.get("/volume/map")
async def volume_map_example() -> MVSResponse:
    """
    Renders a volume in MAP format
    """

    builder = create_builder()

    download = builder.download(url="https://www.ebi.ac.uk/pdbe/entry-files/1tqn.ccp4")
    volume = download.parse(format="map").volume()
    (
        volume.representation(type="isosurface", relative_isovalue=1, show_wireframe=True)
        .color(color="blue")
        .opacity(opacity=0.66)
    )

    return JSONResponse(builder.get_state().to_dict())


@router.get("/volume/volume-server")
async def volume_server_map_example() -> MVSResponse:
    """
    Renders a volume obtained from the Mol* Volume Server
    """

    builder = create_builder()

    structure = builder.download(url=_url_for_mmcif("1tqn")).parse(format="mmcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="white")
    ligand = structure.component(selector="ligand")
    ligand.representation(type="ball_and_stick").color(custom={"molstar_color_theme_name": "element-symbol"})
    ligand.focus(up=(0.98, -0.19, 0), direction=(-28.47, -17.66, -16.32), radius=14, radius_extent=5)

    volume_data = builder.download(
        url="https://www.ebi.ac.uk/pdbe/densities/x-ray/1tqn/box/-22.367,-33.367,-21.634/-7.106,-10.042,-0.937?detail=3"
    ).parse(format="bcif")

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

    snapshot = builder.get_snapshot(
        title="1tqn",
        description="""
### 1tqn with ligand and electron density map
- 2FO-FC at 1.5σ, blue
- FO-FC (positive) at 3σ, green
- FO-FC (negative) at -3σ, red
""",
    )

    return PlainTextResponse(
        States(snapshots=[snapshot], metadata=GlobalMetadata(description="1tqn + Volume Server")).dumps(indent=2)
    )


##############################################################################
# meta endpoints


@router.get("/data/{id}/molecule")
async def cif_data_molecule(id: str) -> Response:
    """
    Download the content of `molecule.cif`.
    """
    path = settings.TEST_DATA_DIR / id / "molecule.cif"
    return FileResponse(path)


@router.get("/data/{id}/cif-annotations")
async def cif_data_annotation(id: str) -> Response:
    """
    Download the content of `annotations.cif`.
    """
    annotations = (settings.TEST_DATA_DIR / id / "annotations.cif").read_text()
    return PlainTextResponse(f"data_{id}_annotations\n{annotations}")


@router.get("/data/{id}/molecule-and-cif-annotations")
async def cif_data_molecule_and_annotation(id: str) -> Response:
    """
    Get a mmCIF structure file with the contents of `annotations.cif` concatenated to the end.
    """
    mol = (settings.TEST_DATA_DIR / id / "molecule.cif").read_text()
    annotations = (settings.TEST_DATA_DIR / id / "annotations.cif").read_text()
    return PlainTextResponse(f"{mol}\n\n{annotations}")


@router.get("/data/{id}/json-annotations")
async def json_list(id: str) -> Response:
    """
    Lists all available JSON annotations for a given `id`.
    """
    path = settings.TEST_DATA_DIR / id
    names = [f.name[:-5] for f in path.glob("*.json")]
    return JSONResponse(names)


@router.get("/data/{id}/json/{name}")
async def json_data(id: str, name: str) -> Response:
    """
    Download a specific JSON file. Use the `data/{id}/json-annotations` endpoint to discover available files.
    """
    path = settings.TEST_DATA_DIR / id / f"{name}.json"
    return FileResponse(path)


@router.get("/data/file/{filepath:path}")
async def file(filepath: str) -> Response:
    """
    Download a specific file. (Mostly for testing)
    """
    path = settings.TEST_DATA_DIR / filepath
    return FileResponse(path)


@router.get("/data/{id}/validation")
async def validation_data(id: str) -> Response:
    """
    Fetches PDBe validation data for an entry and composes a JSON color instruction.
    :param id: entry to process
    :return: a JSON that can be understood by Mol* and will color all residues depending on the number of issues
    """
    response = requests.get(f"https://www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry/{id.lower()}")
    data = response.json()
    transformed_data = []

    for molecule in data[id.lower()]["molecules"]:
        for chain in molecule["chains"]:
            for residue in chain["models"][0]["residues"]:
                residue_number = residue["residue_number"]
                asym_id = chain[
                    "struct_asym_id"
                ]  # "struct_asym_id" contains label_asym_id, "chain_id" contains auth_asym_id
                outlier_types = residue["outlier_types"]
                issue_count = len(outlier_types)

                color = ""
                if issue_count == 1:
                    color = "#ffff00"
                elif issue_count == 2:
                    color = "#ff8800"
                elif issue_count >= 3:
                    color = "#ff0000"

                transformed_residue = {
                    "label_seq_id": residue_number,
                    "label_asym_id": asym_id,
                    "color": color,
                    "tooltip": ", ".join(outlier_types),
                }
                transformed_data.append(transformed_residue)

    return JSONResponse(transformed_data)


@router.get("/data/basic-primitives")
async def basic_primitives_data() -> Response:
    """
    Create example primitive data.
    """
    builder = create_builder().primitives(
        tooltip="Triangle",
        instances=[
            # Translate Z by -0.5 and 0.5
            (1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -0.5, 1),
            (1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0.5, 1),
        ],
    )
    (
        builder.tube(start=(0, 0, 0), end=(1, 0, 0), color="red", tooltip="A")
        .tube(start=(0, 0, 0), end=(0.5, (1 - 0.5**2) ** 0.5, 0), color="green", tooltip="B")
        .tube(start=(1, 0, 0), end=(0.5, (1 - 0.5**2) ** 0.5, 0), color="blue")
    )
    return JSONResponse(builder.as_data_node())


##############################################################################
# Examples for frontend testing


@router.get("/testing/formats")
async def testing_formats_example() -> MVSResponse:
    """Return state with three proteins loaded in mmCIF, binaryCIF, and PDB format"""
    builder = create_builder()
    parse_cif = (
        builder.download(url=_url_for_mmcif("1tqn"))
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation()
        .color(color="white")
    )
    parse_bcif = (
        builder.download(url=_url_for_bcif("2nnj"))
        .parse(format="bcif")
        .model_structure()
        .component()
        .representation()
        .color(color="blue")
    )
    parse_pdb = (
        builder.download(url=_url_for_pdb("1akd"))
        .parse(format="pdb")
        .model_structure()
        .component()
        .representation()
        .color(color="red")
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/structures")
async def testing_structures_example() -> MVSResponse:
    """
    Return state with deposited model for 1og2 (dimer, white),
    two assemblies for 1og5 (monomers, blue and cyan);
    and three models for 1wrf (NMR conformations)
    """
    builder = create_builder()
    entry = (
        builder.download(url=_url_for_mmcif("1og2"))
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation()
        .color(color="white")
    )
    assembly_1 = (
        builder.download(url=_url_for_mmcif("1og5"))
        .parse(format="mmcif")
        .assembly_structure(assembly_id="1")
        .component()
        .representation()
        .color(color="cyan")
    )
    assembly_2 = (
        builder.download(url=_url_for_mmcif("1og5"))
        .parse(format="mmcif")
        .assembly_structure(assembly_id="2")
        .component()
        .representation()
        .color(color="blue")
    )
    cif_1wrf = builder.download(url=_url_for_mmcif("1wrf")).parse(format="mmcif")
    model_0 = cif_1wrf.model_structure(model_index=0).component().representation().color(color="#CC0000")
    model_1 = cif_1wrf.model_structure(model_index=1).component().representation().color(color="#EE7700")
    model_2 = cif_1wrf.model_structure(model_index=2).component().representation().color(color="#FFFF00")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/symmetry_structures")
async def testing_symmetry_structures_example(id: str = "1tqn") -> MVSResponse:
    """
    Return state with deposited model structure for 1tqn (white),
    along with symmetry structure (blue) and symmetry_mates structure (green).
    """
    builder = create_builder()
    structure_url = "http://0.0.0.0:9000/api/v1/examples/data/file/1cbs_2nnj_1tqn.cif"
    model = builder.download(url=structure_url).parse(format="mmcif")
    model.model_structure(block_header="1TQN", model_index=0).component().representation().color(color="white")
    model.symmetry_structure(block_index=2, ijk_min=(0, 0, 0), ijk_max=(1, 1, 0)).transform(
        translation=(100, 0, 0)
    ).component().representation().color(color="blue")
    model.symmetry_mates_structure(block_index=2, radius=40).transform(
        translation=(-130, 0, 0)
    ).component().representation().color(color="green")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/transforms")
async def testing_transforms_example(id: str = "1cbs") -> MVSResponse:
    """
    Return state demonstrating different transforms:
    1cbs in original conformation (white), moved (blue), rotated +90 deg around Z (green),
    # and rotated twice(+90 deg around X then +90 deg around Y, orange)
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    model = builder.download(url=structure_url).parse(format="bcif")
    original = model.model_structure().component(selector="all").representation().color(color="white")
    moved = (
        model.model_structure()
        .transform(translation=(0, -40, 0))
        .component(selector="all")
        .representation()
        .color(color="blue")
    )
    rotatedZ90 = (
        model.model_structure()
        .transform(
            rotation=(
                0,
                1,
                0,  # this is a column, because of column-major convention
                -1,
                0,
                0,
                0,
                0,
                1,
            ),
            translation=(80, 5, 0),
        )
        .component(selector="all")
        .representation()
        .color(color="green")
    )
    combination = (
        model.model_structure()
        .transform(
            rotation=(  # rotateX90
                1,
                0,
                0,
                0,
                0,
                1,
                0,
                -1,
                0,
            )
        )
        .transform(
            rotation=(  # rotateY90
                0,
                0,
                -1,
                0,
                1,
                0,
                1,
                0,
                0,
            ),
            translation=(40, 10, 40),
        )
        .component(selector="all")
        .representation()
        .color(color="orange")
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/components")
async def testing_components_example() -> MVSResponse:
    """
    Return state demonstrating different static components
    (polymer, ligand, ion, water, branched, protein, nucleic)
    """
    builder = create_builder()
    struct1 = builder.download(url=_url_for_mmcif("2nnj")).parse(format="mmcif").model_structure()
    struct1.component(selector="polymer").representation(type="cartoon").color(color="white")
    struct1.component(selector="ligand").representation(type="surface").color(color="blue")
    struct1.component(selector="ion").representation(type="surface").color(color="cyan")
    struct1.component(selector="water").representation(type="ball_and_stick").color(color="red")

    struct2 = (
        builder.download(url=_url_for_mmcif("5t3x"))
        .parse(format="mmcif")
        .model_structure()
        .transform(translation=(0, 0, -130))
    )
    struct2.component(selector="polymer").representation(type="cartoon").color(color="orange")
    struct2.component(selector="branched").representation(type="ball_and_stick").color(color="green")

    struct3 = (
        builder.download(url=_url_for_mmcif("8h0v"))
        .parse(format="mmcif")
        .model_structure()
        .transform(translation=(-70, -100, -170))
    )
    struct3.component(selector="protein").representation(type="surface").color(color="white")
    struct3.component(selector="nucleic").representation(type="cartoon").color(color="red")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/carbs")
async def testing_carbs_example() -> MVSResponse:
    """
    Return state demonstrating carbohydrate representation
    """
    builder = create_builder()

    struct = builder.download(url=_url_for_mmcif("5t3x")).parse(format="mmcif").model_structure()
    struct.component(selector="polymer").representation(type="cartoon").color(color="orange")
    struct.component(selector="branched").representation(type="ball_and_stick").color(color="green")
    struct.component(selector="branched").representation(type="carbohydrate").color(
        custom={"molstar_use_default_coloring": True}
    )

    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_from_source")
async def testing_color_from_source_example(tooltips: bool = False) -> MVSResponse:
    """
    Color from the same CIF as structure
    """
    builder = create_builder()
    structure_url = f"http://0.0.0.0:9000/api/v1/examples/data/1cbs/molecule-and-cif-annotations"
    structure = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    field_remapping = {"label_asym_id": "label_asym_id", "label_seq_id": "label_seq_id", "label_atom_id": None}
    structure.component(selector="polymer").representation(type="cartoon").color(color="white").color_from_source(
        schema="all_atomic",
        category_name="mvs_test_chain_label_annotation",
        field_remapping=field_remapping,
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="white").color_from_source(
        schema="all_atomic",
        block_header="1CBS",
        category_name="mvs_test_chain_label_annotation",
        field_name="color",
        field_remapping=field_remapping,
    )
    if tooltips:
        structure.tooltip_from_source(
            schema="all_atomic",
            category_name="mvs_test_chain_label_annotation",
            field_name="tooltip",
            field_remapping=field_remapping,
        )
        structure.tooltip_from_source(
            schema="all_atomic",
            category_name="mvs_test_chain_label_annotation",
            field_name="color",
            field_remapping=field_remapping,
        )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_rainbow")
async def testing_color_rainbow_example() -> MVSResponse:
    """
    An example with different representations and coloring for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure = builder.download(url=_url_for_mmcif("1cbs")).parse(format="mmcif").model_structure()
    structure.component(selector="protein").representation(type="cartoon").color(color="white").color_from_uri(
        schema="all_atomic",
        uri="http://0.0.0.0:9000/api/v1/examples/data/1cbs/json/rainbow",
        format="json",
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color_from_uri(
        schema="all_atomic",
        uri="http://0.0.0.0:9000/api/v1/examples/data/1cbs/json/rainbow",
        format="json",
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_cif")
async def testing_color_cif_example() -> MVSResponse:
    """
    An example with CIF-encoded coloring.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif("1cbs")
    annotation_url = "http://0.0.0.0:9000/api/v1/examples/data/file/1cbs/custom.cif"
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="white").color_from_uri(
        schema="atom",
        uri=annotation_url,
        format="cif",
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="white").color_from_uri(
        schema="atom",
        uri=annotation_url,
        format="cif",
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_multicategory_cif")
async def testing_color_cif_multicategory_example() -> MVSResponse:
    """
    An example with CIF-encoded coloring.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif("1cbs")
    annotation_url = "http://0.0.0.0:9000/api/v1/examples/data/file/1cbs/custom-multicategory.cif"
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="white").color_from_uri(
        schema="atom",
        uri=annotation_url,
        format="cif",
        block_index=1,
        category_name="color",
        field_name="secondary_color",
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="white").color_from_uri(
        schema="atom",
        uri=annotation_url,
        format="cif",
        block_header="block2",
        category_name="black_is_good",
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_bcif")
async def testing_color_bcif_example() -> MVSResponse:
    """
    An example with BCIF-encoded coloring.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif("1cbs")
    annotation_url = "http://0.0.0.0:9000/api/v1/examples/data/file/1cbs/custom.bcif"
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="white").color_from_uri(
        schema="atom",
        uri=annotation_url,
        format="bcif",
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="white").color_from_uri(
        schema="atom",
        uri=annotation_url,
        format="bcif",
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_small")
async def testing_color_small_example() -> MVSResponse:
    """
    An example with a small structure coloring applied down to atom level.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif("2bvk")
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="all").representation(type="ball_and_stick").color(color="white").color_from_uri(
        schema="all_atomic",
        uri="http://0.0.0.0:9000/api/v1/examples/data/2bvk/json/atoms",
        format="json",
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_domains")
async def testing_color_domains_example(colors: bool = True, tooltips: bool = False) -> MVSResponse:
    """
    An example with different representations and coloring for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif("1h9t")
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    reprs = [
        structure.component(selector="protein").representation(type="cartoon").color(color="white"),
        structure.component(selector="nucleic").representation(type="ball_and_stick").color(color="white"),
        structure.component(selector="ion").representation(type="surface"),
    ]
    if colors:
        for repr in reprs:
            repr.color_from_uri(
                schema="all_atomic",
                uri="http://0.0.0.0:9000/api/v1/examples/data/1h9t/json/domains",
                format="json",
            )
    if tooltips:
        structure.tooltip_from_uri(
            schema="all_atomic",
            uri="http://0.0.0.0:9000/api/v1/examples/data/1h9t/json/domains",
            format="json",
        )
        structure.tooltip_from_uri(
            schema="all_atomic",
            uri="http://0.0.0.0:9000/api/v1/examples/data/1h9t/json/domains",
            format="json",
            field_name="label_asym_id",
        )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_validation")
async def testing_color_validation_example(
    id: str = "1tqn", tooltips: bool = False, labels: bool = False
) -> MVSResponse:
    """
    An example with different representations and coloring for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/{id}/json/validation"
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="protein").representation(type="cartoon").color(color="#00ff00").color_from_uri(
        schema="residue",
        uri=annotation_url,
        format="json",
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="#00ff00").color_from_uri(
        schema="residue",
        uri=annotation_url,
        format="json",
    )
    if tooltips:
        structure.tooltip_from_uri(
            schema="all_atomic",
            uri=annotation_url,
            format="json",
            field_name="tooltip",
        )
    if labels:
        structure.label_from_uri(
            schema="all_atomic",
            uri=annotation_url,
            format="json",
            field_name="tooltip",
        )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_multilayer")
async def testing_color_multilayer_example(id: str = "1tqn") -> MVSResponse:
    """
    An example with different representations and coloring for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    (
        structure.component(selector="protein")
        .representation(type="cartoon")
        .color(
            color="#00dd00",
            selector=[
                ComponentExpression(beg_label_seq_id=1, end_label_seq_id=176),
                ComponentExpression(beg_label_seq_id=242),
            ],
        )
        .color_from_uri(
            schema="residue",
            uri=f"http://0.0.0.0:9000/api/v1/examples/data/{id}/json/validation",
            format="json",
        )
        .color(
            color="magenta",
            selector=[
                ComponentExpression(beg_label_seq_id=50, end_label_seq_id=63),
                ComponentExpression(beg_auth_seq_id=373, end_auth_seq_id=376),
                ComponentExpression(beg_auth_seq_id=393, end_auth_seq_id=396),
            ],
        )
        .color(color="blue", selector=ComponentExpression(label_seq_id=52))
        .color(color="blue", selector=ComponentExpression(label_seq_id=61))
        .color(color="blue", selector=ComponentExpression(label_seq_id=354))
        .color(color="blue", selector=ComponentExpression(label_seq_id=373))
    )
    (
        structure.component(selector="ligand")
        .representation(type="ball_and_stick")
        .color(color="gray")
        .color(color="blue", selector=[ComponentExpression(type_symbol="N")])
        .color(color="red", selector=[ComponentExpression(type_symbol="O")])
        .color(color="yellow", selector=[ComponentExpression(type_symbol="S")])
        .color(color="#AA0022", selector=[ComponentExpression(type_symbol="FE")])
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_palette_categorical")
async def testing_color_palette_categorical(id: str = "1hda") -> MVSResponse:
    """
    An example with color_from_source with categorical color palette.
    """
    builder = create_builder()
    structure_url = _url_for_bcif(id)
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    (
        structure.component(selector="polymer")
        .representation(type="cartoon")
        .color_from_source(
            schema="all_atomic",
            category_name="atom_site",
            field_name="auth_asym_id",
            # Set1 palette as named color list:
            palette=CategoricalPalette(colors="Set1"),
        )
    )
    (
        structure.component(selector="ligand")
        .representation(type="ball_and_stick")
        .color_from_source(
            schema="all_atomic",
            category_name="atom_site",
            field_name="auth_asym_id",
            # Pastel1 palette as explicit color list:
            palette=CategoricalPalette(
                colors=[
                    "#fbb4ae",
                    "#b3cde3",
                    "#ccebc5",
                    "#decbe4",
                    "#fed9a6",
                    "#ffffcc",
                    "#e5d8bd",
                    "#fddaec",
                    "#f2f2f2",
                ],
                repeat_color_list=False,
                sort="lexical",
                sort_direction="ascending",
                case_insensitive=False,
                missing_color="magenta",
            ),
            # Pastel1 palette as explicit color dict:
            # palette=CategoricalPalette(colors={"A": "#fbb4ae", "B": "#b3cde3", "C": "#ccebc5", "D": "#decbe4", "E": "#fed9a6", "F": "#ffffcc", "G": "#e5d8bd", "H": "#fddaec", "I": "#f2f2f2"}),
            # Pastel1 palette as named color list:
            # palette=CategoricalPalette(colors="Pastel1"),
        )
        .color_from_source(
            schema="all_atomic",
            category_name="atom_site",
            field_name="type_symbol",
            # ElementSymbol palette as named color dict:
            palette=CategoricalPalette(colors="ElementSymbol"),
        )
    )
    structure.component().tooltip(text="Chain:")
    structure.tooltip_from_source(schema="all_atomic", category_name="atom_site", field_name="auth_asym_id")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_palette_discrete")
async def testing_color_palette_discrete(id: str = "Q8W3K0") -> MVSResponse:
    """
    An example with color_from_source with discrete color palette.
    """
    builder = create_builder()
    structure_url = _url_for_alphafold_bcif(id)
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    (
        structure.component(selector="polymer")
        .representation(type="cartoon")
        .color_from_source(
            # Color by pLDDT:
            schema="all_atomic",
            category_name="atom_site",
            field_name="B_iso_or_equiv",
            palette=DiscretePalette(
                colors=[["#FF7D45", 0], ["#FFDB13", 50], ["#65CBF3", 70], ["#0053D6", 90]],
                mode="absolute",
            ),
        )
    )
    structure.component().tooltip(text="pLDDT:")
    structure.tooltip_from_source(schema="all_atomic", category_name="atom_site", field_name="B_iso_or_equiv")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/color_palette_continuous")
async def testing_color_palette_continuous(id: str = "1hda") -> MVSResponse:
    """
    An example with color_from_source with continuous color palette.
    """
    # TODO
    builder = create_builder()
    structure_url = _url_for_bcif(id)
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    (
        structure.component(selector="polymer")
        .representation(type="cartoon")
        .color_from_source(
            # Color by B-factor:
            schema="all_atomic",
            category_name="atom_site",
            field_name="B_iso_or_equiv",
            palette=ContinuousPalette(
                colors="OrRd",
                reverse=False,
                mode="normalized",
                value_domain=[0, 100],
                underflow_color="white",
                overflow_color="red",
            ),
        )
    )
    structure.component().tooltip(text="B-factor:")
    structure.tooltip_from_source(schema="all_atomic", category_name="atom_site", field_name="B_iso_or_equiv")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/component_from_uri")
async def testing_component_from_uri(id: str = "1h9t") -> MVSResponse:
    """
    An example with component_from_uri.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/{id}/json/domains"
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component_from_uri(
        uri=annotation_url,
        format="json",
        schema="all_atomic",
    ).representation(type="cartoon")
    structure.component_from_uri(
        uri=annotation_url,
        format="json",
        schema="all_atomic",
        field_name="tooltip",
        field_values=["Ligand binding site"],
    ).representation(type="ball_and_stick").color(selector=ComponentExpression(type_symbol="O"), color="red").color(
        selector=ComponentExpression(type_symbol="N"), color="blue"
    ).color(
        selector=ComponentExpression(type_symbol="S"), color="yellow"
    )
    structure.component_from_uri(
        uri=annotation_url,
        format="json",
        schema="all_atomic",
        field_name="tooltip",
        field_values=["DNA X", "DNA Y"],
    ).representation(type="ball_and_stick").color(color="#0066BB")
    structure.component_from_uri(
        uri=annotation_url,
        format="json",
        schema="all_atomic",
        field_name="tooltip",
        field_values="Chloride",
    ).representation(type="surface").color(color="green")
    structure.component_from_uri(
        uri=annotation_url,
        format="json",
        schema="all_atomic",
        field_name="tooltip",
        field_values="Gold",
    ).representation(type="surface").color(color="orange")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/component_from_source")
async def testing_component_from_source(id: str = "1h9t") -> MVSResponse:
    """
    An example with component_from_source.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component_from_source(
        schema="all_atomic",
        category_name="atom_site",
    ).representation(type="cartoon")
    structure.component_from_source(
        schema="all_atomic",
        category_name="atom_site",
        field_name="label_entity_id",
        field_values="1",
    ).representation(type="ball_and_stick").color(color="cyan")
    structure.component_from_source(
        schema="all_atomic",
        category_name="atom_site",
        field_name="label_entity_id",
        field_values=["2", "3"],
    ).representation(type="ball_and_stick").color(color="blue")
    structure.component_from_source(
        schema="all_atomic",
        category_name="atom_site",
        field_name="label_entity_id",
        field_values=["4"],
    ).representation(type="surface").color(color="orange")
    structure.component_from_source(
        schema="all_atomic",
        category_name="atom_site",
        field_name="label_entity_id",
        field_values=["5"],
    ).representation(type="surface").color(color="green")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/focus")
async def testing_focus_example() -> MVSResponse:
    """
    An example for "focus" node.
    """
    builder = create_builder()
    position, direction, radius = _target_spherical_to_pdr((17, 21, 27), phi=-30, theta=15, radius=100)
    up = (0.2, 1, 0)
    structure_url = _url_for_local_bcif("1cbs")
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="orange")
    structure.component(selector="ligand").focus(direction=direction, up=up).representation(
        type="ball_and_stick"
    ).color(color="green")
    builder.canvas(background_color="#BBDDFF")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/camera")
async def testing_camera_example() -> MVSResponse:
    """
    An example for "camera" node.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif("1cbs")
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="orange")
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="green")
    target, position, up = _target_spherical_to_tpu((17, 21, 27), phi=30, theta=15, radius=100)
    builder.camera(target=target, position=position, up=up)
    builder.canvas(background_color="black")
    return JSONResponse(builder.get_state().to_dict())


def _target_spherical_to_pdr(target: tuple[float, float, float], phi: float = 0, theta: float = 0, radius: float = 100):
    x, y, z = target
    phi, theta = math.radians(phi), math.radians(theta)
    direction = (-math.sin(phi) * math.cos(theta), -math.sin(theta), -math.cos(phi) * math.cos(theta))
    position = (x - direction[0] * radius, y - direction[1] * radius, z - direction[2] * radius)
    return position, direction, radius


def _target_spherical_to_tpu(target: tuple[float, float, float], phi: float = 0, theta: float = 0, radius: float = 100):
    x, y, z = target
    phi, theta = math.radians(phi), math.radians(theta)
    direction = (-math.sin(phi) * math.cos(theta), -math.sin(theta), -math.cos(phi) * math.cos(theta))
    position = (x - direction[0] * radius, y - direction[1] * radius, z - direction[2] * radius)
    up = (0, 1, 0)
    return target, position, up


@router.get("/testing/labels")
async def testing_labels_example(id="1h9t") -> MVSResponse:
    """
    An example with different labels for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="protein").representation(type="cartoon").color(color="white").color_from_uri(
        schema="all_atomic",
        uri="http://0.0.0.0:9000/api/v1/examples/data/1h9t/json/domains",
        format="json",
    )
    structure.component(selector="nucleic").representation(type="ball_and_stick").color(color="white").color_from_uri(
        schema="all_atomic",
        uri="http://0.0.0.0:9000/api/v1/examples/data/1h9t/json/domains",
        format="json",
    )
    structure.component(selector="ion").representation(type="surface").color_from_uri(
        schema="all_atomic",
        uri="http://0.0.0.0:9000/api/v1/examples/data/1h9t/json/domains",
        format="json",
    )
    structure.component(selector=ComponentExpression(label_asym_id="A", beg_label_seq_id=9, end_label_seq_id=83)).label(
        text="DNA-binding"
    )
    structure.component(selector=ComponentExpression(label_asym_id="B", beg_label_seq_id=9, end_label_seq_id=83)).label(
        text="DNA-binding"
    )
    structure.component(
        selector=ComponentExpression(label_asym_id="A", beg_label_seq_id=84, end_label_seq_id=231)
    ).label(text="Acyl-CoA\nbinding")
    structure.component(
        selector=ComponentExpression(label_asym_id="B", beg_label_seq_id=84, end_label_seq_id=231)
    ).label(text="Acyl-CoA binding")
    structure.component(selector=ComponentExpression(label_asym_id="C")).label(text="DNA X")
    structure.component(selector=ComponentExpression(label_asym_id="D")).label(text="DNA Y")

    structure.component(selector=ComponentExpression(label_asym_id="D", atom_id=4016)).label(text="DNA Y O5'")
    structure.component(selector=ComponentExpression(label_asym_id="D", atom_id=4391)).label(text="DNA Y O3'")
    structure.component(selector=ComponentExpression(label_asym_id="E")).label(text="Gold")
    structure.component(selector=ComponentExpression(label_asym_id="H")).label(text="Gold")
    structure.component(selector=ComponentExpression(label_asym_id="F")).label(text="Chloride")
    structure.component(selector=ComponentExpression(label_asym_id="G")).label(text="Chloride")
    structure.component(selector=ComponentExpression(label_asym_id="I")).label(text="Chloride")

    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=57)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=67)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=121)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=125)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=129)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=178)).label(text="Ligand binding")
    structure.component(
        selector=ComponentExpression(label_asym_id="A", beg_label_seq_id=203, end_label_seq_id=205)
    ).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=67)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=121)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=125)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=129)).label(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=178)).label(text="Ligand binding")
    structure.component(
        selector=ComponentExpression(label_asym_id="B", beg_label_seq_id=203, end_label_seq_id=205)
    ).label(text="Ligand binding")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/tooltips")
async def testing_tooltips_example(id="1h9t") -> MVSResponse:
    """
    An example with different labels for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/{id}/json/domains"
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    structure.component(selector="protein").representation(type="cartoon").color(color="white").color_from_uri(
        schema="all_atomic",
        uri=annotation_url,
        format="json",
    )
    structure.component(selector="nucleic").representation(type="ball_and_stick").color(color="white").color_from_uri(
        schema="all_atomic",
        uri=annotation_url,
        format="json",
    )
    structure.component(selector="ion").representation(type="surface").color_from_uri(
        schema="all_atomic",
        uri=annotation_url,
        format="json",
    )
    structure.component(
        selector=ComponentExpression(label_asym_id="A", beg_label_seq_id=9, end_label_seq_id=83)
    ).tooltip(text="DNA-binding")
    structure.component(
        selector=ComponentExpression(label_asym_id="B", beg_label_seq_id=9, end_label_seq_id=83)
    ).tooltip(text="DNA-binding")
    structure.component(
        selector=ComponentExpression(label_asym_id="A", beg_label_seq_id=84, end_label_seq_id=231)
    ).tooltip(text="Acyl-CoA\nbinding")
    structure.component(
        selector=ComponentExpression(label_asym_id="B", beg_label_seq_id=84, end_label_seq_id=231)
    ).tooltip(text="Acyl-CoA binding")

    structure.component_from_uri(
        uri=annotation_url,
        format="json",
        schema="all_atomic",
        field_name="tooltip",
        field_values="DNA X",
    ).tooltip(text="DNA X (this component comes from URL)")
    structure.component_from_uri(
        uri=annotation_url,
        format="json",
        schema="all_atomic",
        field_name="tooltip",
        field_values="DNA Y",
    ).tooltip(text="DNA Y (this component comes from URL)")

    structure.component_from_source(
        schema="all_atomic",
        category_name="atom_site",
        field_name="type_symbol",
        field_values="CL",
    ).tooltip(text="Chloride (this component comes from CIF)")
    structure.component_from_source(
        schema="all_atomic",
        category_name="atom_site",
        field_name="type_symbol",
        field_values="AU",
    ).tooltip(text="Gold (this component comes from CIF)")

    structure.component(selector=ComponentExpression(label_asym_id="D", atom_id=4016)).tooltip(text="DNA Y O5'")
    structure.component(selector=ComponentExpression(label_asym_id="D", atom_id=4391)).tooltip(text="DNA Y O3'")

    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=57)).tooltip(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=67)).tooltip(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=121)).tooltip(
        text="Ligand binding"
    )
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=125)).tooltip(
        text="Ligand binding"
    )
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=129)).tooltip(
        text="Ligand binding"
    )
    structure.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=178)).tooltip(
        text="Ligand binding"
    )
    structure.component(
        selector=ComponentExpression(label_asym_id="A", beg_label_seq_id=203, end_label_seq_id=205)
    ).tooltip(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=67)).tooltip(text="Ligand binding")
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=121)).tooltip(
        text="Ligand binding"
    )
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=125)).tooltip(
        text="Ligand binding"
    )
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=129)).tooltip(
        text="Ligand binding"
    )
    structure.component(selector=ComponentExpression(label_asym_id="B", label_seq_id=178)).tooltip(
        text="Ligand binding"
    )
    structure.component(
        selector=ComponentExpression(label_asym_id="B", beg_label_seq_id=203, end_label_seq_id=205)
    ).tooltip(text="Ligand binding")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/labels_from_uri")
async def testing_labels_from_uri_example(id="1h9t", annotation_name="domains") -> MVSResponse:
    """
    An example with different labels for polymer and non-polymer chains.
    """
    builder = create_builder()
    structure_url = _url_for_local_bcif(id)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/1h9t/json/{annotation_name}"
    structure = builder.download(url=structure_url).parse(format="bcif").model_structure()
    protein = structure.component(selector="protein")
    protein.representation(type="cartoon").color(color="white").color_from_uri(
        schema="all_atomic",
        uri=annotation_url,
        format="json",
    )
    nucleic = structure.component(selector="nucleic")
    nucleic.representation(type="ball_and_stick").color(color="white").color_from_uri(
        schema="all_atomic",
        uri=annotation_url,
        format="json",
    )
    ion = structure.component(selector="ion")
    ion.representation(type="surface").color_from_uri(
        schema="all_atomic",
        uri=annotation_url,
        format="json",
    )
    structure.label_from_uri(uri=annotation_url, format="json", schema="all_atomic", field_name="tooltip")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/labels_from_source")
async def testing_labels_from_source_example() -> MVSResponse:
    """
    Labels from the same CIF as structure
    """
    builder = create_builder()
    structure_url = f"http://0.0.0.0:9000/api/v1/examples/data/1cbs/molecule-and-cif-annotations"
    structure = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="white").color_from_source(
        schema="all_atomic",
        category_name="mvs_test_chain_label_annotation",
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="white").color_from_source(
        schema="all_atomic", block_header="1CBS", category_name="mvs_test_chain_label_annotation", field_name="color"
    )
    structure.label_from_source(
        schema="all_atomic", category_name="mvs_test_chain_label_annotation", field_name="tooltip"
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/operator_name_inline_selector")
async def testing_operator_name_inline_selector() -> MVSResponse:
    """
    Example for `operator_name` field used in ComponentExpression
    """
    builder = create_builder()
    structure_url = f"https://www.ebi.ac.uk/pdbe/entry-files/download/1m4x.bcif"
    structure = builder.download(url=structure_url).parse(format="bcif").assembly_structure(assembly_id="1")
    (
        structure.component(selector="all")
        .representation(type="cartoon")
        .color(color="#dddddd")
        .color_from_source(
            schema="all_atomic",
            category_name="atom_site",
            field_name="label_asym_id",
            palette=CategoricalPalette(colors="Pastel2"),
        )
        .color(selector=ComponentExpression(operator_name="54-75"), color="red")
    )
    (
        structure.component(selector=ComponentExpression(operator_name="54-75"))
        .focus()
        .representation(type="surface")
        .color(color="red")
        .opacity(opacity=0.5)
    )
    for chain in ["A", "B", "C"]:
        (
            structure.component(selector=ComponentExpression(operator_name="54-75", label_asym_id=chain))
            .label(text=f"Selected {chain}")
            .tooltip(text=f"The selected instance - Chain {chain}")
        )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/operator_name_annot_selector")
async def testing_operator_name_annot_selector() -> MVSResponse:
    """
    Example for `operator_name` field used in MVS annotations
    """
    builder = create_builder()
    structure_url = f"https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn.bcif"
    annotation_url = (
        "data:text/plain,"
        "  data_annotations"
        "  loop_"
        "  _annotations.label_asym_id"
        "  _annotations.beg_label_seq_id"
        "  _annotations.end_label_seq_id"
        "  _annotations.operator_name"
        "  _annotations.color"
        "  A  20  50 1 red"
        "  A  60  90 2 yellow"
        "  A 100 130 3 green"
        "  A 140 170 4 blue"
    )
    structure = builder.download(url=structure_url).parse(format="bcif").assembly_structure(assembly_id="2")
    (
        structure.component(selector="all")
        .representation(type="cartoon")
        .color(color="#dddddd")
        .color_from_uri(
            uri=annotation_url,
            format="cif",
            schema="all_atomic",
            category_name="annotations",
            field_name="color",
        )
    )
    (
        structure.label_from_uri(
            uri=annotation_url,
            format="cif",
            schema="all_atomic",
            category_name="annotations",
            field_name="color",
        ).tooltip_from_uri(
            uri=annotation_url,
            format="cif",
            schema="all_atomic",
            category_name="annotations",
            field_name="color",
        )
    )
    (
        structure.component_from_uri(
            uri=annotation_url,
            format="cif",
            schema="all_atomic",
            category_name="annotations",
            field_name="color",
        )
        .representation(type="surface")
        .color(color="#c040c0")
        .opacity(opacity=0.3)
    )
    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/angle-primitive")
async def testing_angle_primitive_example() -> MVSResponse:
    """
    Return a state showing an angle
    """
    builder = create_builder()
    primitives = builder.primitives()
    primitives.angle(
        a=(2, 1, 1),
        b=(1, 1, 1),
        c=(2, 2, 1),
        section_color="blue",
        section_radius_scale=0.5,
        vector_color="red",
        label_color="green",
    )

    return JSONResponse(builder.get_state().to_dict())


@router.get("/testing/primitives/from-uri")
async def primitives_from_uri_example() -> MVSResponse:
    """
    Draws primitived provided by a JSON asset
    """
    builder = create_builder()
    builder.primitives_from_uri(uri="http://localhost:9000/api/v1/examples/data/basic-primitives")

    return JSONResponse(builder.get_state().to_dict())


##############################################################################
# MVS specification of existing visualizations

CAMERA_FOR_1HDA: Mapping = {
    "target": (19.752, 39.904, 19.170),
    "position": (34.411, 131.418, 44.150),
    "up": (0.035, -0.268, 0.962),
}
CAMERA_FOR_1HDA_A: Mapping = {
    "target": (30.403, 48.948, 10.986),
    "position": (5.350, 4.252, 45.337),
    "up": (0.704, -0.636, -0.313),
}
CAMERA_FOR_1HDA_HEM: Mapping = {
    "target": (26.795, 49.162, 6.437),
    "position": (-11.895, 72.486, 22.770),
    "up": (0.587, 0.728, 0.352),
}
CAMERA_FOR_1TQN: Mapping = {
    "target": (-19.768, -24.352, -12.891),
    "position": (82.412, -19.409, -11.594),
    "up": (0.015, -0.063, -0.997),
}
CAMERA_FOR_1GKT: Mapping = {
    "target": (8.594, 28.682, 11.525),
    "position": (69.856, -31.750, 25.286),
    "up": (0.211, -0.007, -0.977),
}
CAMERA_FOR_Q5VSL9: Mapping = {
    "target": (16.066, 10.270, -4.742),
    "position": (97.823, 164.346, 45.265),
    "up": (-0.576, 0.512, -0.636),
}
ENTITY_COLORS_1HDA = {"1": "#1A9E76", "2": "#D85F02", "3": "#A6D853"}
ENTITIES_1HDA = {"polymer": ["1", "2"], "ligand": ["3"]}
BASE_COLOR = "#787878"
BASE_OPACITY = 0.3


@router.get("/portfolio/entry")
async def portfolio_entry_or_assembly(
    coloring: Literal["by_chain", "by_entity"] = "by_chain", assembly_id: Union[str, None] = None
) -> MVSResponse:
    """
    Entry or assembly structure colored by chain, as created by PDBImages.
    (We are missing coloring by symmetry operator for assemblies!)
    """
    ID = "1hda"
    builder = create_builder()
    structure_url = _url_for_mmcif(ID)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/file/{ID}/portfolio.cif"
    model = builder.download(url=structure_url).parse(format="mmcif")
    struct = model.assembly_structure(assembly_id=assembly_id) if assembly_id is not None else model.model_structure()
    struct.component(selector="polymer").representation(type="cartoon").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"color_{coloring}"
    )
    struct.component(selector="ligand").representation(type="ball_and_stick").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"color_{coloring}"
    ).color_from_uri(uri=annotation_url, format="cif", schema="all_atomic", category_name="color_by_symbol")
    builder.camera(**CAMERA_FOR_1HDA)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/entity")
async def portfolio_entity(entity_id: str = "1", assembly_id: str = "1") -> MVSResponse:
    """
    Assembly structure with a higlighted entity, as created by PDBImages.
    (We are missing advanced styling, like size-factor and opacity!)
    """
    ID = "1hda"
    builder = create_builder()
    structure_url = _url_for_mmcif(ID)
    struct = builder.download(url=structure_url).parse(format="mmcif").assembly_structure(assembly_id=assembly_id)
    highlight = ENTITY_COLORS_1HDA.get(entity_id, "black")
    for type, entities in ENTITIES_1HDA.items():
        for ent in entities:
            (
                struct.component(selector=ComponentExpression(label_entity_id=ent))
                .representation(type="ball_and_stick" if type == "ligand" else "cartoon")
                .color(color=highlight if ent == entity_id else BASE_COLOR)
                .opacity(opacity=1 if ent == entity_id else BASE_OPACITY)
            )
    builder.camera(**CAMERA_FOR_1HDA)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/domain")
async def portfolio_domain() -> MVSResponse:
    """
    Chain structure with a higlighted SIFTS domain, as created by PDBImages.
    (We are missing advanced styling, like size-factor and opacity!)
    """
    ID = "1hda"
    DOMAIN = "Pfam_PF00042_A"
    builder = create_builder()
    structure_url = _url_for_mmcif(ID)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/file/{ID}/portfolio.cif"
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    polymer = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"sifts_{DOMAIN}",
        schema="all_atomic",
        field_name="component",
        field_values="polymer",
    )
    domain = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"sifts_{DOMAIN}",
        schema="all_atomic",
        field_name="component",
        field_values="domain",
    )
    ligand = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"sifts_{DOMAIN}",
        schema="all_atomic",
        field_name="component",
        field_values="ligand",
    )
    polymer.representation(type="cartoon").color(color=BASE_COLOR).opacity(opacity=BASE_OPACITY)
    domain.representation(type="cartoon").color_from_uri(
        uri=annotation_url, format="cif", category_name=f"sifts_{DOMAIN}", schema="all_atomic"
    )
    ligand.representation(type="ball_and_stick").color(color=BASE_COLOR).opacity(opacity=BASE_OPACITY)
    struct.tooltip_from_uri(uri=annotation_url, format="cif", category_name=f"sifts_{DOMAIN}", schema="all_atomic")
    builder.camera(**CAMERA_FOR_1HDA_A)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/ligand")
async def portfolio_ligand() -> MVSResponse:
    """
    Ligand environment, as created by PDBImages.
    (We are missing advanced styling, like size-factor and opacity!)
    """
    ID = "1hda"
    LIGAND = "HEM"
    builder = create_builder()
    structure_url = _url_for_mmcif(ID)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/file/{ID}/portfolio.cif"
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    wideenv = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"ligand_{LIGAND}",
        schema="all_atomic",
        field_name="component",
        field_values="wideenv",
    )
    wideenv.representation(type="cartoon").color(color=BASE_COLOR).opacity(opacity=BASE_OPACITY)
    env = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"ligand_{LIGAND}",
        schema="all_atomic",
        field_name="component",
        field_values="env",
    )
    env.representation(type="ball_and_stick").color(color=BASE_COLOR).color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name="color_by_symbol"
    )
    lig = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"ligand_{LIGAND}",
        schema="all_atomic",
        field_name="component",
        field_values="ligand",
    )
    lig.representation(type="ball_and_stick").color(color="#A6D853").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name="color_by_symbol"
    )
    linkage = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"ligand_{LIGAND}",
        schema="all_atomic",
        field_name="component",
        field_values="linkage",
    )
    linkage.representation(type="ball_and_stick").color(color="#A6D853").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name="color_by_symbol"
    )
    struct.tooltip_from_uri(uri=annotation_url, format="cif", category_name=f"ligand_{LIGAND}", schema="all_atomic")
    builder.camera(**CAMERA_FOR_1HDA_HEM)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/validation")
async def portfolio_validation() -> MVSResponse:
    """
    Entry structure colored by validation report issues, as created by PDBImages.
    """
    ID = "1hda"
    builder = create_builder()
    structure_url = _url_for_mmcif(ID)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/file/{ID}/validation.json"
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    struct.component(selector="polymer").representation(type="cartoon").color(color="#00ff00").color_from_uri(
        uri=annotation_url, format="json", schema="all_atomic"
    )
    struct.component(selector="ligand").representation(type="ball_and_stick").color(color="#00ff00").color_from_uri(
        uri=annotation_url, format="json", schema="all_atomic"
    )
    struct.tooltip_from_uri(uri=annotation_url, format="json", schema="all_atomic")
    builder.camera(**CAMERA_FOR_1HDA)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/modres")
async def portfolio_modres() -> MVSResponse:
    """
    Assembly structure with higlighted instances of a modified residue, as created by PDBImages.
    (We are missing advanced styling, like size-factor and opacity!)
    """
    ID = "1gkt"
    ASSEMBLY = "1"
    builder = create_builder()
    structure_url = _url_for_mmcif(ID)
    struct = builder.download(url=structure_url).parse(format="mmcif").assembly_structure(assembly_id=ASSEMBLY)
    struct.component(selector="polymer").representation(type="cartoon").color(color=BASE_COLOR).opacity(
        opacity=BASE_OPACITY
    )
    struct.component(selector="ligand").representation(type="ball_and_stick").color(color=BASE_COLOR).opacity(
        opacity=BASE_OPACITY
    )
    struct.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=54)).tooltip(
        text="Modified residue SUI: (3-amino-2,5-dioxo-1-pyrrolidinyl)acetic acid"
    ).representation(type="ball_and_stick").color(color="#ED645A")
    builder.camera(**CAMERA_FOR_1GKT)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/bfactor")
async def portfolio_bfactor() -> MVSResponse:
    """
    Entry structure colored by B-factor, as created by PDBImages.
    (We are missing putty representation and size theme!)
    """
    ID = "1tqn"
    builder = create_builder()
    structure_url = _url_for_mmcif(ID)
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/file/{ID}/bfactor.cif"
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    struct.component(selector="polymer").representation(type="cartoon").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"bfactor"
    )
    struct.component(selector="ligand").representation(type="ball_and_stick").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"bfactor"
    )
    struct.component(selector="branched").representation(type="ball_and_stick").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"bfactor"
    )
    struct.component().tooltip(text="B-factor value:")
    struct.tooltip_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"bfactor", field_name="B_iso_or_equiv"
    )
    builder.camera(**(CAMERA_FOR_1TQN if ID == "1tqn" else CAMERA_FOR_1HDA))
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/plddt")
async def portfolio_plddt() -> MVSResponse:
    """
    AlphaFold predicted structure colored by pLDDT, as created by PDBImages.
    """
    ID = "AF-Q5VSL9-F1-model_v4"
    builder = create_builder()
    structure_url = f"https://alphafold.ebi.ac.uk/files/{ID}.cif"
    annotation_url = f"http://0.0.0.0:9000/api/v1/examples/data/file/{ID}/plddt.cif"
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    struct.component(selector="polymer").representation(type="cartoon").color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"plddt", field_name="color"
    )
    struct.component().tooltip(text="pLDDT value:")
    struct.tooltip_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name=f"plddt", field_name="plddt"
    )
    builder.camera(**CAMERA_FOR_Q5VSL9)
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/pdbe_entry_page")
async def portfolio_pdbe_entry_page(id: str = "7xv8") -> MVSResponse:
    """
    "PDBe entry page 3D view" from https://docs.google.com/spreadsheets/d/1sUSWmBLfKMmPLW2yqVnxWQTQoVk6SmQppdCfItyO1m0/edit#gid=0
    """
    builder = create_builder()
    structure_url = _url_for_mmcif(id)
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    struct.component(selector="protein").tooltip(text="protein").representation(type="cartoon").color(color="#1d9671")
    struct.component(selector="nucleic").tooltip(text="nucleic").representation(type="cartoon").color(color="#ff449e")
    _color_by_symbol(
        struct.component(selector="ligand").tooltip(text="ligand").representation(type="ball_and_stick"), base="#888888"
    )
    _color_by_symbol(
        struct.component(selector="ion").tooltip(text="ion").representation(type="ball_and_stick"), base="#888888"
    )
    _color_by_symbol(
        struct.component(selector="branched").tooltip(text="branched").representation(type="ball_and_stick"),
        base="#888888",
    )
    struct.component(selector="water").tooltip(text="water").representation(type="ball_and_stick").color(
        color="#98170f"
    )
    builder.canvas(background_color="#000000")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/pdbe_entry_page_entity")
async def portfolio_pdbe_entry_page_entity(id: str = "7xv8", entity_id: str = "1") -> MVSResponse:
    """
    "PDBe entry page entity view" from https://docs.google.com/spreadsheets/d/1sUSWmBLfKMmPLW2yqVnxWQTQoVk6SmQppdCfItyO1m0/edit#gid=0
    """
    builder = create_builder()
    structure_url = _url_for_mmcif(id)
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    struct.component(selector="polymer").representation(type="cartoon").color(color="#dfc2c1").color(
        selector=ComponentExpression(label_entity_id=entity_id), color="#720202"
    )
    struct.component(selector="ligand").representation(type="ball_and_stick").color(color="#dfc2c1")
    struct.component(selector="ion").representation(type="ball_and_stick").color(color="#dfc2c1")
    struct.component(selector="branched").representation(type="ball_and_stick").color(color="#dfc2c1")
    struct.component(selector="water").representation(type="ball_and_stick").color(color="#dfc2c1")
    struct.component(selector=ComponentExpression(label_entity_id=entity_id)).tooltip(text=f"Entity {entity_id}")
    builder.canvas(background_color="#000000")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/pdbekb_default")
async def portfolio_pdbekb_default(id: str = "7xv8", entity_id: str = "1") -> MVSResponse:
    """
    "PDBe-KB default view" from https://docs.google.com/spreadsheets/d/1sUSWmBLfKMmPLW2yqVnxWQTQoVk6SmQppdCfItyO1m0/edit#gid=0
    """
    builder = create_builder()
    structure_url = _url_for_mmcif(id)
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    struct.component(selector="polymer").representation(type="cartoon").color(color="#dcbfbe").color(
        selector=ComponentExpression(label_entity_id=entity_id), color="#2b6bd2"
    )
    struct.component(selector="ligand").representation(type="ball_and_stick").color(color="#dcbfbe")
    struct.component(selector="ion").representation(type="ball_and_stick").color(color="#dcbfbe")
    struct.component(selector="branched").representation(type="ball_and_stick").color(color="#dcbfbe")
    struct.component(selector="water").representation(type="ball_and_stick").color(color="#dcbfbe")
    struct.component(selector=ComponentExpression(label_entity_id=entity_id)).tooltip(text=f"Entity {entity_id}")
    builder.canvas(background_color="#ffffff")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/pdbekb_segment_superpose")
async def portfolio_pdbekb_segment_superpose(
    id1: str = "1tqn", chain1: str = "A", id2: str = "2nnj", chain2: str = "A"
) -> MVSResponse:
    """
    "PDBe-KB segment superpose view" from https://docs.google.com/spreadsheets/d/1sUSWmBLfKMmPLW2yqVnxWQTQoVk6SmQppdCfItyO1m0/edit#gid=0
    (We are missing putty representation!)
    """
    builder = create_builder()
    structure_url1 = _url_for_mmcif(id1)  # TODO use model server, only retrieve the chain
    structure_url2 = _url_for_mmcif(id2)  # TODO use model server, only retrieve the chain
    struct1 = builder.download(url=structure_url1).parse(format="mmcif").model_structure()
    struct2 = builder.download(url=structure_url2).parse(format="mmcif").model_structure()
    (
        struct1.component(selector=ComponentExpression(label_asym_id=chain1))
        .tooltip(text=f"{id1}, chain {chain1}")
        .representation(type="cartoon")
        .color(color="#1d9873")
    )
    (
        struct2.transform(
            rotation=(
                0.60487772,
                0.37558753,
                0.70218010,
                0.79239364,
                -0.19644937,
                -0.57751176,
                -0.07896334,
                0.90572706,
                -0.41644101,
            ),
            translation=(
                -66.71238433,
                -12.06107678,
                -46.34873616,
            ),
        )
        .component(selector=ComponentExpression(label_asym_id=chain2))
        .tooltip(text=f"{id2}, chain {chain2}")
        .representation(type="cartoon")  # should be putty
        .color(color="#cc5a03")
    )
    builder.canvas(background_color="#ffffff")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/pdbekb_ligand_superpose")
async def portfolio_pdbekb_ligand_superpose(chains: str = "1tqn:A,2nnj:A") -> MVSResponse:
    """
    "PDBe-KB ligand superpose view" from https://docs.google.com/spreadsheets/d/1sUSWmBLfKMmPLW2yqVnxWQTQoVk6SmQppdCfItyO1m0/edit#gid=0
    (We are missing putty representation!)
    """
    builder = create_builder()
    for i, id_chain in enumerate(chains.split(",")):
        id, chain = id_chain.split(":")
        print(id, chain)
        structure_url1 = _url_for_mmcif(id)  # TODO use model server, only retrieve what's needed
        struct = builder.download(url=structure_url1).parse(format="mmcif").model_structure()
        if i > 0:  # this is just an example, transform will have to be different for each structure, of course
            struct.transform(
                rotation=(
                    0.60487772,
                    0.37558753,
                    0.70218010,
                    0.79239364,
                    -0.19644937,
                    -0.57751176,
                    -0.07896334,
                    0.90572706,
                    -0.41644101,
                ),
                translation=(
                    -66.71238433,
                    -12.06107678,
                    -46.34873616,
                ),
            )
        if i == 0:
            struct.component(selector=ComponentExpression(label_asym_id=chain)).representation(type="cartoon").color(
                color="#1d9873"
            )  # should be putty
        struct.component(selector="ligand").representation(type="ball_and_stick").color(color="#f602f7")
        struct.component(selector="ion").representation(type="ball_and_stick").color(color="#f602f7")
    builder.canvas(background_color="#ffffff")
    return JSONResponse(builder.get_state().to_dict())


@router.get("/portfolio/rcsb_entry")
async def portfolio_rcsb_entry(id: str = "3sn6") -> MVSResponse:
    """
    "RCSB PDB entry page 3D view" from https://docs.google.com/spreadsheets/d/1QQ_P0VlURzpMhqa8rI-D2nJ8f1lfrHTpqrN0q5PbACs/edit#gid=0
    (The document says color by entity, but the image looks more like color by auth_asym_id (which is also MolStar's preset))
    """
    builder = create_builder()
    structure_url = _url_for_mmcif(id)
    struct = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    _color_by_entity(struct.component(selector="protein").tooltip(text="protein").representation(type="cartoon"))
    _color_by_entity(struct.component(selector="nucleic").tooltip(text="nucleic").representation(type="cartoon"))
    _color_by_entity(
        struct.component(selector="ligand").tooltip(text="ligand").representation(type="ball_and_stick"),
        use_symbol=True,
    )
    _color_by_entity(
        struct.component(selector="ion").tooltip(text="ion").representation(type="ball_and_stick"), use_symbol=True
    )
    _color_by_entity(
        struct.component(selector="branched").tooltip(text="branched").representation(type="ball_and_stick"),
        use_symbol=True,
    )
    struct.component(selector="water").tooltip(text="water").representation(type="ball_and_stick").color(
        color=SYMBOL_COLORS["O"]
    )
    builder.canvas(background_color="#ffffff")
    return JSONResponse(builder.get_state().to_dict())


##############################################################################
# Auxiliary functions


@router.get("/testing/local_bcif/{id}")
async def testing_local_bcif(id: str) -> Response:
    """Return a PDB structure in BCIF cached on local server (obtain from PDBe and cache if not present)"""
    id = id.lower()
    result_file = settings.TEST_DATA_DIR / "tmp" / f"{id}.bcif"
    if not result_file.exists():
        url = _url_for_bcif(id)
        response = requests.get(url)
        print("status", response.status_code)
        if not response.ok:
            raise Exception(f"Failed to obtain {url}")
        data = response.content
        result_file.parent.mkdir(parents=True, exist_ok=True)
        result_file.write_bytes(data)
    return FileResponse(result_file, media_type="application/octet-stream")


def _url_for_local_bcif(id: str) -> str:
    """Return URL for `testing_local_bcif` endpoint"""
    return f"http://0.0.0.0:9000/api/v1/examples/testing/local_bcif/{id.lower()}"


def _url_for_mmcif(id: str) -> str:
    """Return URL for updated mmCIF file from PDBe server"""
    return f"https://files.wwpdb.org/download/{id.lower()}.cif"


def _url_for_bcif(id: str) -> str:
    """Return URL for updated binary CIF file from PDBe server"""
    return f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}.bcif"


def _url_for_alphafold_bcif(id: str) -> str:
    """Return URL for updated binary CIF file from AlphaFoldDB server"""
    return f"https://alphafold.ebi.ac.uk/files/AF-{id}-F1-model_v4.bcif"


def _url_for_pdb(id: str) -> str:
    """Return URL for good old PDB file from PDBe server"""
    return f"https://files.wwpdb.org/download/{id.lower()}.pdb"


SYMBOL_COLORS = {"N": "#3050F8", "O": "#FF0D0D", "S": "#FFFF30", "FE": "#E06633"}

ENTITY_COLORS = [
    "#1B9E77",
    "#D95F02",
    "#7570B3",
    "#E7298A",
    "#66A61E",
    "#E6AB02",
    "#A6761D",
    "#666666",
    "#E41A1C",
    "#377EB8",
    "#4DAF4A",
    "#984EA3",
    "#FF7F00",
    "#FFFF33",
    "#A65628",
    "#F781BF",
    "#999999",
    "#66C2A5",
    "#FC8D62",
    "#8DA0CB",
    "#E78AC3",
    "#A6D854",
    "#FFD92F",
    "#E5C494",
    "#B3B3B3",
]


def _color_by_symbol(repr: Representation, base: str = "#888888") -> Representation:
    repr.color(color=base)
    for symbol, color in SYMBOL_COLORS.items():
        repr.color(selector=ComponentExpression(type_symbol=symbol), color=color)
    return repr


def _color_by_entity(
    repr: Representation, n_entities: int = 6, colors: list[str] = ENTITY_COLORS, use_symbol: bool = False
) -> Representation:
    for i in range(n_entities):
        entity_id = str(i + 1)
        repr.color(selector=ComponentExpression(label_entity_id=entity_id), color=colors[i % len(colors)])
        if use_symbol:
            for symbol, color in SYMBOL_COLORS.items():
                repr.color(selector=ComponentExpression(label_entity_id=entity_id, type_symbol=symbol), color=color)
    return repr


def _normalize(v):
    length = (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) ** 0.5
    return [v[0] / length, v[1] / length, v[2] / length] if length != 0 else v


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


@router.get("/testing/mvsj_to_mvsx")
async def testing_mvsj_to_mvsx(id: str = "1cbs", download: bool = True) -> Response:
    """
    Create and use a self-contained MVSX archive with all external resources for offline use.

    This example demonstrates how to:
    1. Create an MVSX archive from a MVSJ visualization
    2. Include all external resources in the archive
    3. Extract and verify the archive contents

    :param id: PDB entry ID to visualize
    :param download: Whether to download external resources (default: True)
    :return: The MVSX archive as a file attachment for download
    """
    import json
    import os
    import tempfile

    from molviewspec.mvsx_converter import extract_mvsx, mvsj_to_mvsx

    # Create a simple visualization
    builder = create_builder()
    (
        builder.download(url=_url_for_mmcif(id))
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation()
        .color(color="blue")
    )

    # Get the MVSJ content
    mvsj_content = MVSJ(
        data=builder.get_state(
            title=f"MVSX Archive Example - {id}",
            description="This visualization is packaged as an MVSX archive with all external resources included.",
            description_format="plaintext",
        )
    ).dumps()

    # Use a single persistent output directory for all files
    output_dir = os.path.join(tempfile.gettempdir(), "mvsx_archives")
    os.makedirs(output_dir, exist_ok=True)

    try:
        # Define all the paths we'll need
        mvsj_path = os.path.join(output_dir, f"{id}.mvsj")
        mvsx_path = os.path.join(output_dir, f"{id}.mvsx")
        extract_dir = os.path.join(output_dir, f"{id}_extracted")

        # Create the extract directory before using it
        os.makedirs(extract_dir, exist_ok=True)

        # Save MVSJ to a file
        with open(mvsj_path, "w", encoding="utf-8") as f:
            f.write(mvsj_content)

        # Create the MVSX archive
        result = mvsj_to_mvsx(mvsj_path, mvsx_path, download_external=download)

        if not result:
            return PlainTextResponse(f"Failed to create MVSX archive for {id}", status_code=500)

        # Extract MVSX to verify its contents
        index_path = extract_mvsx(mvsx_path, extract_dir)

        if not index_path or not os.path.exists(index_path):
            return PlainTextResponse(f"Failed to extract MVSX archive for {id}", status_code=500)

        # Read the extracted index.mvsj to include in response headers
        with open(index_path, "r", encoding="utf-8") as f:
            extracted_mvsj = json.load(f)

        # Include details about the archive in the response headers
        original_url = None
        for child in extracted_mvsj.get("root", {}).get("children", []):
            if child.get("kind") == "download" and "params" in child and "url" in child["params"]:
                original_url = child["params"]["url"]
                break

        # Return the MVSX file as an attachment for download
        return FileResponse(
            mvsx_path,
            media_type="application/zip",
            filename=f"{id}.mvsx",
            headers={
                "X-MVSX-Original-URL": original_url or "Not found",
                "X-MVSX-Contents": str(os.listdir(extract_dir)),
            },
        )
    except Exception as e:
        return PlainTextResponse(f"Error creating MVSX archive: {str(e)}", status_code=500)
