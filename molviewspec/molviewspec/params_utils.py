from typing import Type, TypeVar

from pydantic import BaseModel


class Params(BaseModel):
    """Base class for all params classes"""


TParams = TypeVar("TParams", bound=Params)


def make_params(params_type: Type[TParams], values: dict = {}, /, **more_values: object) -> TParams:
    result = {}
    for key in params_type.__annotations__:
        if more_values.get(key) is not None:
            result[key] = more_values.get(key)
        elif values.get(key) is not None:
            result[key] = values.get(key)
    # TODO reimpl validation
    # _validate_params(params_type, result)
    return result  # type: ignore
