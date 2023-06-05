from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse

from app.config import settings
from molviewspec.builder import Root

router = APIRouter()


@router.get("/load/{id}")
async def download_example(id: str):
    builder = Root()
    (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .structure()
        .component()
        .representation()
    )
    return JSONResponse(builder.node)


@router.get("/label/{id}")
async def label_example(id: str):
    builder = Root()
    (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .structure()
        .label(label_asym_id="A", label_seq_id=120, text="Residue 1")
        .label(label_asym_id="C", label_seq_id=271, text="Residue 2")
        .label_from_cif(cif_category_name="my_custom_cif_category")
    )
    return JSONResponse(builder.node)


@router.get("/color/{id}")
async def color_example(id: str):
    builder = Root()
    structure = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
        .parse(format="mmcif")
        .structure()
    )
    structure.component(selector="protein").representation(type="cartoon", color="white").color(
        label_asym_id="A", label_seq_id=64, color="red"
    )
    structure.component(selector="ligand").representation(type="ball-and-stick").color_from_cif(
        cif_category_name="my_custom_cif_category"
    )
    return JSONResponse(builder.node)


@router.get("/data/{id}/molecule")
async def cif_data_molecule(id: str):
    path = settings.TEST_DATA_DIR / id / "molecule.cif"
    return FileResponse(path)


@router.get("/data/{id}/cif-annotations")
async def cif_data_annotation(id: str):
    annotations = (settings.TEST_DATA_DIR / id / "annotations.cif").read_text()
    return PlainTextResponse(f"data_{id}_annotations\n{annotations}")


@router.get("/data/{id}/molecule-and-cif-annotations")
async def cif_data_molecule_and_annotation(id: str):
    mol = (settings.TEST_DATA_DIR / id / "molecule.cif").read_text()
    annotations = (settings.TEST_DATA_DIR / id / "annotations.cif").read_text()
    return PlainTextResponse(f"{mol}\n\n{annotations}")


@router.get("/data/{id}/json-annotations")
async def json_list(id: str):
    """
    Lists all available JSON annotations
    """
    path = settings.TEST_DATA_DIR / id
    names = [f.name[:-5] for f in path.glob("*.json")]
    return JSONResponse(names)


@router.get("/data/{id}/json/{name}")
async def json_data(id: str, name: str):
    path = settings.TEST_DATA_DIR / id / f"{name}.json"
    return FileResponse(path)



@router.get("/testing/formats")
async def testing_formats_example():
    """Return state with three proteins loaded in mmCIF, binaryCIF, and PDB format"""
    builder = Root()
    parse_cif = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn_updated.cif")
        .parse(format="mmcif", is_binary=False)
        .structure()
        .component()
        .representation(color="white")
    )
    parse_bcif = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/2nnj.bcif")
        .parse(format="mmcif", is_binary=True)
        .structure()
        .component()
        .representation(color="blue")
    )
    parse_pdb = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/pdb1akd.ent")
        .parse(format="pdb", is_binary=False)
        .structure()
        .component()
        .representation(color="red")
    )
    return JSONResponse(builder.node)


@router.get("/testing/structures")
async def testing_structures_example():
    """Return state with deposited model for 1og2 (dimer, white), 
    two assemblies for 1og5 (monomers, red and blue);
    and three models for 1wrf (NMR conformations)"""
    builder = Root()
    entry = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1og2_updated.cif")
        .parse(format="mmcif")
        .structure(assembly_id=None)
        .component()
        .representation(color="white")
    )
    assembly_1 = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1og5_updated.cif")
        .parse(format="mmcif")
        .structure(assembly_id="1")
        .component()
        .representation(color="red")
    )
    assembly_2 = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1og5_updated.cif")
        .parse(format="mmcif")
        .structure(assembly_id="2")
        .component()
        .representation(color="blue")
    )
    cif_1wrf = (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1wrf_updated.cif")
        .parse(format="mmcif")
    )
    model_0 = (
        cif_1wrf
        .structure(model_index=0)
        .component()
        .representation(color="white")
    )
    model_1 = (
        cif_1wrf
        .structure(model_index=1)
        .component()
        .representation(color="red")
    )
    model_2 = (
        cif_1wrf
        .structure(model_index=2)
        .component()
        .representation(color="blue")
    )
    # TODO check model indexing convention (0- or 1-based)
    return JSONResponse(builder.node)


@router.get("/testing/components")
async def testing_components_example():
    builder = Root()
    structure = (
        builder
        .download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/8h0v_updated.cif")
        .parse(format="mmcif")
        .structure()
    )
    (
        structure
        .component(selector="protein")
        .representation(type="surface", color="white")
        .color(label_asym_id="A", label_seq_id=64, color="red")
    )
    (
        structure
        .component(selector="nucleic")
        .representation(type="cartoon", color="red")
        .color_from_cif(cif_category_name="my_custom_cif_category")
    )
    structure2 = (
        builder
        .download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/????_updated.cif")
        .parse(format="mmcif")
        .structure()
    )
    # TODO add all component types to this example
    return JSONResponse(builder.node)
