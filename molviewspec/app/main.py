from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.examples import router as examples_router

router = APIRouter()
router.include_router(examples_router, prefix="/examples")


app = FastAPI(title="Mol View Spec Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=3)

app.include_router(router, prefix="/api/v1")
