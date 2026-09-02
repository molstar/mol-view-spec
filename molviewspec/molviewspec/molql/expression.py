"""JSON-native MolQL expression types and validation helpers."""

from __future__ import annotations

import math
from typing import Any, Mapping, Sequence, TypeAlias, TypeGuard

MolQLLiteralT: TypeAlias = str | int | float | bool
MolQLSymbolT: TypeAlias = dict[str, str]
MolQLArgumentsT: TypeAlias = list["MolQLExpressionT"] | dict[str, "MolQLExpressionT"]
MolQLApplyT: TypeAlias = dict[str, Any]
MolQLExpressionT: TypeAlias = MolQLLiteralT | MolQLSymbolT | MolQLApplyT


class MolQLValidationError(ValueError):
    """Raised when a value is not a valid serialized MolQL expression."""


def symbol(name: str) -> MolQLSymbolT:
    """Create a serialized MolQL symbol."""

    if not name:
        raise MolQLValidationError("MolQL symbol names must not be empty")
    return {"name": name}


def apply(head: MolQLExpressionT, args: MolQLArgumentsT | None = None) -> MolQLApplyT:
    """Create a serialized MolQL application."""

    result: MolQLApplyT = {"head": head}
    if args is not None:
        result["args"] = args
    return result


def is_symbol(value: object) -> TypeGuard[MolQLSymbolT]:
    return isinstance(value, dict) and isinstance(value.get("name"), str)


def is_apply(value: object) -> TypeGuard[MolQLApplyT]:
    return isinstance(value, dict) and "head" in value


def is_expression(value: object) -> TypeGuard[MolQLExpressionT]:
    """Return whether *value* has the recursive JSON shape of MolQL."""

    if isinstance(value, bool) or isinstance(value, str):
        return True
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return math.isfinite(value)
    if is_symbol(value):
        return True
    if not is_apply(value) or not is_expression(value["head"]):
        return False
    if "args" not in value:
        return True
    args = value["args"]
    if isinstance(args, list):
        return all(is_expression(arg) for arg in args)
    if isinstance(args, dict):
        return all(isinstance(key, str) and is_expression(arg) for key, arg in args.items())
    return False


def validate_expression(
    value: object,
    *,
    require_application: bool = False,
    known_symbols: set[str] | None = None,
) -> MolQLExpressionT:
    """Validate a serialized MolQL expression and return it unchanged."""

    if not is_expression(value):
        raise MolQLValidationError("Invalid recursive MolQL expression shape")
    if require_application and not is_apply(value):
        raise MolQLValidationError("MolQL expression must be a MolScript application")
    _validate_applications(value, known_symbols)
    return value


def _validate_applications(value: MolQLExpressionT, known_symbols: set[str] | None) -> None:
    if not is_apply(value):
        return
    head = value["head"]
    if not is_symbol(head):
        raise MolQLValidationError("MolQL applications can only apply symbols")
    if known_symbols is not None and head["name"] not in known_symbols:
        raise MolQLValidationError(f"MolQL symbol '{head['name']}' is not implemented")
    args = value.get("args")
    if isinstance(args, Sequence) and not isinstance(args, (str, bytes)):
        for arg in args:
            _validate_applications(arg, known_symbols)
    elif isinstance(args, Mapping):
        for arg in args.values():
            _validate_applications(arg, known_symbols)
