from typing import Optional

from pydantic import BaseModel, Field

from molviewspec.nodes import PrimitiveParamsT, PrimitivesParams


class PrimitivesData(BaseModel):
    primitives: list[PrimitiveParamsT] = Field(description="A list of primitives to render")
    options: Optional[PrimitivesParams] = Field(description="Default options for all the primitives")
