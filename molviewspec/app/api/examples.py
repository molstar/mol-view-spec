import requests
from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse

from app.config import settings
from molviewspec.builder import Root

router = APIRouter()


@router.get("/load/{id}")
async def download_example(id: str):
    """
    Download a minimal example that visualizes a given PDB entry in cartoon representation.
    """
    builder = Root()
    (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation()
    )
    return JSONResponse(builder.get_state())


@router.get("/label/{id}")
async def label_example(id: str):
    """
    The minimal example enriched by custom labels and labels read from the CIF source file.
    """
    builder = Root()
    structure = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .model_structure()
    )
    structure.component().representation()
    structure.label(schema="residue", label_asym_id="A", label_seq_id=120, text="Residue 1").label(
        schema="residue", label_asym_id="C", label_seq_id=271, text="Residue 2"
    ).label_from_cif(schema="residue", category_name="my_custom_cif_category")
    return JSONResponse(builder.get_state())


@router.get("/color/{id}")
async def color_example(id: str):
    """
    An example with different representations and coloring for polymer and non-polymer chains.
    """
    builder = Root()
    structure = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .model_structure()
    )
    structure.component(selector="protein").representation(type="cartoon", color="white").color(
        schema="residue", label_asym_id="A", label_seq_id=64, color="red", tooltip="Active Site"
    )
    structure.component(selector="ligand").representation(type="ball-and-stick").color_from_cif(
        schema="residue", category_name="my_custom_cif_category"
    )
    return JSONResponse(builder.get_state())


@router.get("/symmetry-mates/{id}")
async def symmetry_example(id: str):
    """
    Add symmetry mates within a distance threshold.
    """
    builder = Root()
    (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .symmetry_mate_structure(radius=5.0)
    )
    return JSONResponse(builder.get_state())


@router.get("/symmetry/{id}")
async def symmetry_example(id: str):
    """
    Create symmetry mates by specifying Miller indices.
    """
    builder = Root()
    (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .symmetry_structure(ijk_min=(-1, -1, -1), ijk_max=(1, 1, 1))
    )
    return JSONResponse(builder.get_state())


@router.get("/validation/{id}")
async def validation_example(id: str):
    """
    Color a structure by annotation data in JSON.
    :param id: the entry to process
    :return: view spec of a structure that will color residues depending on the number of validation report issues
    """
    builder = Root()
    (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .assembly_structure()
        .component()
        .representation(color="#ffffff")
        .color_from_url(schema="residue", url=f"/data/{id}/validation", format="json")
    )
    return JSONResponse(builder.get_state())


@router.get("/data/{id}/molecule")
async def cif_data_molecule(id: str):
    """
    Download the content of `molecule.cif`.
    """
    path = settings.TEST_DATA_DIR / id / "molecule.cif"
    return FileResponse(path)


@router.get("/data/{id}/cif-annotations")
async def cif_data_annotation(id: str):
    """
    Download the content of `annotations.cif`.
    """
    annotations = (settings.TEST_DATA_DIR / id / "annotations.cif").read_text()
    return PlainTextResponse(f"data_{id}_annotations\n{annotations}")


@router.get("/data/{id}/molecule-and-cif-annotations")
async def cif_data_molecule_and_annotation(id: str):
    """
    Get a mmCIF structure file with the contents of `annotations.cif` concatenated to the end.
    """
    mol = (settings.TEST_DATA_DIR / id / "molecule.cif").read_text()
    annotations = (settings.TEST_DATA_DIR / id / "annotations.cif").read_text()
    return PlainTextResponse(f"{mol}\n\n{annotations}")


@router.get("/data/{id}/json-annotations")
async def json_list(id: str):
    """
    Lists all available JSON annotations for a given `id`.
    """
    path = settings.TEST_DATA_DIR / id
    names = [f.name[:-5] for f in path.glob("*.json")]
    return JSONResponse(names)


@router.get("/data/{id}/json/{name}")
async def json_data(id: str, name: str):
    """
    Download a specific JSON file. Use the `data/{id}/json-annotations` endpoint to discover available files.
    """
    path = settings.TEST_DATA_DIR / id / f"{name}.json"
    return FileResponse(path)


@router.get("/data/{id}/validation")
async def validation_data(id: str):
    """
    Fetches PDBe validation data for an entry and composes a JSON color instruction.
    :param id: entry to process
    :return: a JSON that can be understood by Mol* and will color all residues depending on the number of issues
    """
    data = requests.get(f"https://www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry/{id}").json()
    transformed_data = []

    for molecule in data[id]["molecules"]:
        for chain in molecule["chains"]:
            for residue in chain["models"][0]["residues"]:
                residue_number = residue["residue_number"]
                chain_id = chain["chain_id"]
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
                    "label_asym_id": chain_id,
                    "color": color,
                    "tooltip": ", ".join(outlier_types),
                }
                transformed_data.append(transformed_residue)

    return JSONResponse(transformed_data)


@router.get("/testing/formats")
async def testing_formats_example():
    """Return state with three proteins loaded in mmCIF, binaryCIF, and PDB format"""
    builder = Root()
    parse_cif = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn_updated.cif")
        .parse(format="mmcif", is_binary=False)
        .model_structure()
        .component()
        .representation(color="white")
    )
    parse_bcif = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/2nnj.bcif")
        .parse(format="mmcif", is_binary=True)
        .model_structure()
        .component()
        .representation(color="blue")
    )
    parse_pdb = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/pdb1akd.ent")
        .parse(format="pdb", is_binary=False)
        .model_structure()
        .component()
        .representation(color="red")
    )
    return JSONResponse(builder.get_state())


@router.get("/testing/structures")
async def testing_structures_example():
    """Return state with deposited model for 1og2 (dimer, white),
    two assemblies for 1og5 (monomers, red and blue);
    and three models for 1wrf (NMR conformations)"""
    builder = Root()
    entry = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1og2_updated.cif")
        .parse(format="mmcif")
        .model_structure()
        .component()
        .representation(color="white")
    )
    assembly_1 = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1og5_updated.cif")
        .parse(format="mmcif")
        .assembly_structure(assembly_id="1")
        .component()
        .representation(color="red")
    )
    assembly_2 = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1og5_updated.cif")
        .parse(format="mmcif")
        .assembly_structure(assembly_id="2")
        .component()
        .representation(color="blue")
    )
    cif_1wrf = builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1wrf_updated.cif").parse(
        format="mmcif"
    )
    model_0 = cif_1wrf.model_structure(model_index=0).component().representation(color="white")
    model_1 = cif_1wrf.model_structure(model_index=1).component().representation(color="red")
    model_2 = cif_1wrf.model_structure(model_index=2).component().representation(color="blue")
    # TODO check model indexing convention (0- or 1-based)
    return JSONResponse(builder.get_state())


@router.get("/testing/components")
async def testing_components_example():
    builder = Root()
    structure = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/8h0v_updated.cif")
        .parse(format="mmcif")
        .model_structure()
    )
    (
        structure.component(selector="protein")
        .representation(type="surface", color="white")
        .color(schema="residue", label_asym_id="A", label_seq_id=64, color="red")
    )
    (
        structure.component(selector="nucleic")
        .representation(type="cartoon", color="red")
        .color_from_cif(schema="residue", category_name="my_custom_cif_category")
    )
    structure2 = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/????_updated.cif")
        .parse(format="mmcif")
        .model_structure()
    )
    # TODO add all component types to this example
    return JSONResponse(builder.get_state())
