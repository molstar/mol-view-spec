from typing import Any, Mapping, Type, TypeVar

from pydantic import BaseModel

from molviewspec import __version__

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


def get_major_version_tag() -> str:
    """
    Reports the version of this implementation. Omits minor and patch values if v1+, omits patch value if in v0.
    :return: major version tag as str
    """
    version_parts = __version__.split(".")
    major = ".".join(version_parts[:2])
    return major
