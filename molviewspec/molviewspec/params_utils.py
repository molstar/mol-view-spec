from typing import ForwardRef, Iterable, Type, TypeVar

from typing_extensions import TypedDict, is_typeddict


class Params(TypedDict):
    """Base class for all params classes"""


TParams = TypeVar("TParams", bound=Params)


def _required_keys(params_type: Type[Params]) -> Iterable[str]:
    assert is_typeddict(params_type)
    if any(isinstance(annot, ForwardRef) for annot in params_type.__annotations__.values()):
        # `__required_keys__` does not work correctly with `from __future__ import annotations`: https://github.com/python/cpython/issues/97727
        raise ValueError(
            f"Cannot use this function with typed dict {params_type.__name__} because it was defined with `from __future__ import annotations`, see Python bug https://github.com/python/cpython/issues/97727"
        )
    else:
        return params_type.__required_keys__  # type: ignore


def _validate_params(params_type: Type[Params], params: dict) -> None:
    for key in _required_keys(params_type):
        if key not in params:
            raise ValueError(f"{params_type.__name__} required key `{key}` is missing in `{params}`")


def make_params(params_type: Type[TParams], values: dict = {}, /, **more_values: object) -> TParams:
    result = {}
    for key in params_type.__annotations__:
        if more_values.get(key) is not None:
            result[key] = more_values.get(key)
        elif values.get(key) is not None:
            result[key] = values.get(key)
    _validate_params(params_type, result)
    return result  # type: ignore
