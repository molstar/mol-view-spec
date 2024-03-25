"""
Helper functions used by examples.py.
"""

import inspect

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ValidationError

import molviewspec
from molviewspec.nodes import validate_state_tree as validate_state_tree_internal
from molviewspec.utils import get_major_version_tag

router = APIRouter()


# Create a custom endpoint to serve the OpenAPI JSON for your Pydantic models
@router.get("/models/openapi.json")
async def models_openapi() -> JSONResponse:
    openapi_models = {}

    # collect relevant impls
    for name, clazz in inspect.getmembers(molviewspec.nodes) + inspect.getmembers(molviewspec.builder):
        # TODO suppress 'private' classes?
        if inspect.isclass(clazz) and issubclass(clazz, BaseModel) and clazz != BaseModel:
            openapi_models[clazz.__name__] = clazz.schema()

    openapi_spec = {
        "openapi": "3.0.0",
        "info": {"title": "MolViewSpec Node Schema OpenAPI", "version": get_major_version_tag()},
        "paths": {},
        "components": {"schemas": openapi_models},
    }

    return JSONResponse(content=openapi_spec)


@router.get("/validate-state-tree")
async def validate_state_tree(json: str) -> Response:
    try:
        validate_state_tree_internal(json)
        return JSONResponse({"valid": True})
    except ValidationError as e:
        return JSONResponse(status_code=422, content=e.json())
