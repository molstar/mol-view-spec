from fastapi import APIRouter
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse

from molviewspec.builder import Root
from app.config import settings

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


@router.get("/data/{id}/molecule")
async def cif_data(id: str):
    path = settings.TEST_DATA_DIR / id / "molecule.cif"
    return FileResponse(path)


@router.get("/data/{id}/cif-annotations")
async def cif_data(id: str):
    annotations = (settings.TEST_DATA_DIR / id / "annotations.cif").read_text()
    return PlainTextResponse(f"data_{id}_annotations\n{annotations}")


@router.get("/data/{id}/molecule-and-cif-annotations")
async def cif_data(id: str):
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
