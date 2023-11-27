from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.examples import router as examples_router
from app.api.utils import router as utils_router

router = APIRouter()
router.include_router(examples_router, prefix="/examples")
router.include_router(utils_router, prefix="/utils")


app = FastAPI(
    title="Mol View Spec Server",
    description="""
Generate Mol* views using this simple Python library, which allows you to compose complex scenes in a step-wise manner.

This API demonstrates the capabilities of that library and provides a range of examples to:
* load structure data
* create representations such as cartoon, ball-and-stick etc for different polymer chains, ligands etc
* adjust coloring for parts of the structure
* add labels to specific residues

The output is a JSON file that can be opened by Mol* and will create the defined view.
              """,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=3)

app.include_router(router, prefix="/api/v1")
