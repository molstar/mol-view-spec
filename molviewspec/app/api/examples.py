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
    structure = builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")\
        .parse(format="mmcif")\
        .structure()
    # TODO how to move back to parent node, to e.g. define multiple components for the same "structure"
    # TODO select node by kind?
    structure.label(label_asym_id="A", label_seq_id=120, text="Residue 1")\
        .label(label_asym_id="C", label_seq_id=271, text="Residue 2")\
        .label_from_cif(cif_category_name="my_custom_cif_category")
    return JSONResponse(builder.node)

