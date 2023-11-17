from typing import Any, Mapping, Type, TypeVar

from pydantic import BaseModel

TParams = TypeVar("TParams", bound=BaseModel)


def make_params(params_type: Type[TParams], values=None, /, **more_values: object) -> Mapping[str, Any]:
    if values is None:
        values = {}
    result = {}

    for field in params_type.__fields__.values():
        # must use alias here to properly resolve goodies like `schema_`
        key = field.alias
        if more_values.get(key) is not None:
            result[key] = more_values[key]
        elif values.get(key) is not None:
            result[key] = values[key]
        elif field.default is not None:  # currently not used
            result[key] = field.default

    return result  # type: ignore
