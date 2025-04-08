from typing import Any, Mapping, Type, TypeVar

from pydantic import BaseModel

from molviewspec import __version__

TParams = TypeVar("TParams", bound=BaseModel)


def get_model_fields(model_type: Any) -> dict[str, Any]:
    """
    Get fields of a Pydantic model.
    """
    # Pydantic v1 compatibility
    if hasattr(model_type, "model_fields"):
        return model_type.model_fields
    return model_type.__fields__


def make_params(params_type: Type[TParams], values=None, /, **more_values: object) -> Mapping[str, Any]:
    if params_type is None:
        raise ValueError("Param type couldn't be resolved to a concrete class -- did you misspell the value of `type`?")

    if values is None:
        values = {}
    result = {}
    consumed_more_values = set()

    # propagate custom properties
    if values:
        custom_values = values.get("custom")
        if custom_values is not None:
            result["custom"] = custom_values
        ref = values.get("ref")
        if ref is not None:
            result["ref"] = ref

    for field_name, field in get_model_fields(params_type).items():
        # must use alias here to properly resolve goodies like `schema_`
        key = field.alias or field_name

        if more_values.get(key) is not None:
            result[key] = more_values[key]
            consumed_more_values.add(key)
        elif values.get(key) is not None:
            result[key] = values[key]
        elif field.default is not None:  # currently not used
            result[key] = field.default

    non_model_keys = set(more_values.keys()) - consumed_more_values
    if non_model_keys:
        raise ValueError(f"Encountered unknown attribute on {params_type}: {non_model_keys}")

    return result  # type: ignore


def get_major_version_tag() -> str:
    """
    Reports the version of this implementation. Omits minor and patch values if v1+, omits patch value if in v0.
    :return: major version tag as str
    """
    version_parts = __version__.split(".")
    major = ".".join(version_parts[:2])
    return major
