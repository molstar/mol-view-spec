from fastapi import APIRouter
from fastapi.responses import JSONResponse

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
    structure = builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")\
        .parse(format="mmcif")\
        .structure()
    structure.component(selector="protein")\
        .representation(type="cartoon", color="white")\
        .color(label_asym_id="A", label_seq_id=64, color="red")
    structure.component(selector="ligand")\
        .representation(type="ball-and-stick")\
        .color_from_cif(cif_category_name="my_custom_cif_category")
    return JSONResponse(builder.node)
