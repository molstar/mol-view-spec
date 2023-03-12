from fastapi import APIRouter
from fastapi.responses import JSONResponse

from molviewspec.builder import Root

router = APIRouter()


@router.get("/load/{id}")
async def download_example(id: str):
    builder = Root()
    (
        builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif").parse(
            format="mmcif"
        )
    )
    return JSONResponse(builder.node)
