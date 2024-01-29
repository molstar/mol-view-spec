import math
from typing import Literal, TypeAlias, Union

import requests
from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response

from app.config import settings
from molviewspec.builder import Representation, create_builder
from molviewspec.nodes import ComponentExpression

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
    return PlainTextResponse(builder.get_state())


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

    # label the residues with custom text & focus it
    (structure.component(selector=residue).label(text="ALA 120 A: My Label").focus())

    # structure.label_from_source(schema="residue", category_name="my_custom_cif_category")

    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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

    return PlainTextResponse(builder.get_state())


@router.get("/symmetry-mates")
async def symmetry_mates_example(id: str = "1cbs") -> MVSResponse:
    """
    Add symmetry mates within a distance threshold.
    """
    builder = create_builder()
    (builder.download(url=_url_for_mmcif(id)).parse(format="mmcif").symmetry_mates_structure(radius=5.0))
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
            rotation=[
                -0.7202161,
                -0.33009904,
                -0.61018308,
                0.36257631,
                0.57075962,
                -0.73673053,
                0.59146191,
                -0.75184312,
                -0.29138417,
            ],
            translation=[-12.54, 46.79, 94.50],
        )
        .component()
        .representation()
        .color(color="blue")
    )

    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


@router.get("/testing/color_from_source")
async def testing_color_from_source_example(tooltips: bool = False) -> MVSResponse:
    """
    Color from the same CIF as structure
    """
    builder = create_builder()
    structure_url = f"http://0.0.0.0:9000/api/v1/examples/data/1cbs/molecule-and-cif-annotations"
    structure = builder.download(url=structure_url).parse(format="mmcif").model_structure()
    structure.component(selector="polymer").representation(type="cartoon").color(color="white").color_from_source(
        schema="all_atomic",
        category_name="mvs_test_chain_label_annotation",
    )
    structure.component(selector="ligand").representation(type="ball_and_stick").color(color="white").color_from_source(
        schema="all_atomic",
        block_header="1CBS",
        category_name="mvs_test_chain_label_annotation",
        field_name="color",
    )
    if tooltips:
        structure.tooltip_from_source(
            schema="all_atomic",
            category_name="mvs_test_chain_label_annotation",
            field_name="tooltip",
        )
        structure.tooltip_from_source(
            schema="all_atomic",
            category_name="mvs_test_chain_label_annotation",
            field_name="color",
        )
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


##############################################################################
# MVS specification of existing visualizations

CAMERA_FOR_1HDA = {
    "target": (19.752, 39.904, 19.170),
    "position": (34.411, 131.418, 44.150),
    "up": (0.035, -0.268, 0.962),
}
CAMERA_FOR_1HDA_A = {
    "target": (30.403, 48.948, 10.986),
    "position": (5.350, 4.252, 45.337),
    "up": (0.704, -0.636, -0.313),
}
CAMERA_FOR_1HDA_HEM = {
    "target": (26.795, 49.162, 6.437),
    "position": (-11.895, 72.486, 22.770),
    "up": (0.587, 0.728, 0.352),
}
CAMERA_FOR_1TQN = {
    "target": (-19.768, -24.352, -12.891),
    "position": (82.412, -19.409, -11.594),
    "up": (0.015, -0.063, -0.997),
}
CAMERA_FOR_1GKT = {
    "target": (8.594, 28.682, 11.525),
    "position": (69.856, -31.750, 25.286),
    "up": (0.211, -0.007, -0.977),
}
CAMERA_FOR_Q5VSL9 = {
    "target": (16.066, 10.270, -4.742),
    "position": (97.823, 164.346, 45.265),
    "up": (-0.576, 0.512, -0.636),
}
ENTITY_COLORS_1HDA = {"1": "#1A9E76", "2": "#D85F02", "3": "#A6D853"}
BASE_COLOR = "#CCCCCC"  # should be #787878 but that's too dark because of missing transparency


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
    return PlainTextResponse(builder.get_state())


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
    struct.component(selector="polymer").representation(type="cartoon").color(color=BASE_COLOR).color(
        selector=ComponentExpression(label_entity_id=entity_id), color=highlight
    )
    struct.component(selector="ligand").representation(type="ball_and_stick").color(color=BASE_COLOR).color(
        selector=ComponentExpression(label_entity_id=entity_id), color=highlight
    )
    builder.camera(**CAMERA_FOR_1HDA)
    return PlainTextResponse(builder.get_state())


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
    ligand = struct.component_from_uri(
        uri=annotation_url,
        format="cif",
        category_name=f"sifts_{DOMAIN}",
        schema="all_atomic",
        field_name="component",
        field_values="ligand",
    )
    polymer.representation(type="cartoon").color(color=BASE_COLOR).color_from_uri(
        uri=annotation_url, format="cif", category_name=f"sifts_{DOMAIN}", schema="all_atomic"
    )
    ligand.representation(type="ball_and_stick").color(color=BASE_COLOR)
    struct.tooltip_from_uri(uri=annotation_url, format="cif", category_name=f"sifts_{DOMAIN}", schema="all_atomic")
    builder.camera(**CAMERA_FOR_1HDA_A)
    return PlainTextResponse(builder.get_state())


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
    wideenv.representation(type="cartoon").color(color=BASE_COLOR).color_from_uri(
        uri=annotation_url, format="cif", schema="all_atomic", category_name="color_by_symbol"
    )
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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    struct.component(selector="polymer").representation(type="cartoon").color(color=BASE_COLOR)
    struct.component(selector="ligand").representation(type="ball_and_stick").color(color=BASE_COLOR)
    struct.component(selector=ComponentExpression(label_asym_id="A", label_seq_id=54)).tooltip(
        text="Modified residue SUI: (3-amino-2,5-dioxo-1-pyrrolidinyl)acetic acid"
    ).representation(type="ball_and_stick").color(color="#ED645A")
    builder.camera(**CAMERA_FOR_1GKT)
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


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
            rotation=[
                0.60487772,
                0.37558753,
                0.70218010,
                0.79239364,
                -0.19644937,
                -0.57751176,
                -0.07896334,
                0.90572706,
                -0.41644101,
            ],
            translation=[
                -66.71238433,
                -12.06107678,
                -46.34873616,
            ],
        )
        .component(selector=ComponentExpression(label_asym_id=chain2))
        .tooltip(text=f"{id2}, chain {chain2}")
        .representation(type="cartoon")  # should be putty
        .color(color="#cc5a03")
    )
    builder.canvas(background_color="#ffffff")
    return PlainTextResponse(builder.get_state())


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
                rotation=[
                    0.60487772,
                    0.37558753,
                    0.70218010,
                    0.79239364,
                    -0.19644937,
                    -0.57751176,
                    -0.07896334,
                    0.90572706,
                    -0.41644101,
                ],
                translation=[
                    -66.71238433,
                    -12.06107678,
                    -46.34873616,
                ],
            )
        if i == 0:
            struct.component(selector=ComponentExpression(label_asym_id=chain)).representation(type="cartoon").color(
                color="#1d9873"
            )  # should be putty
        struct.component(selector="ligand").representation(type="ball_and_stick").color(color="#f602f7")
        struct.component(selector="ion").representation(type="ball_and_stick").color(color="#f602f7")
    builder.canvas(background_color="#ffffff")
    return PlainTextResponse(builder.get_state())


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
    return PlainTextResponse(builder.get_state())


# TODO add portfolio examples from all the documents we have who knows where
# RCSB: https://docs.google.com/spreadsheets/d/1QQ_P0VlURzpMhqa8rI-D2nJ8f1lfrHTpqrN0q5PbACs/edit#gid=0


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
    return f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif"


def _url_for_bcif(id: str) -> str:
    """Return URL for updated binary CIF file from PDBe server"""
    return f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}.bcif"


def _url_for_pdb(id: str) -> str:
    """Return URL for good old PDB file from PDBe server"""
    return f"https://www.ebi.ac.uk/pdbe/entry-files/download/pdb{id.lower()}.ent"


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
