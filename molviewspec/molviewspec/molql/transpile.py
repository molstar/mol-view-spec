"""Eagerly transpile supported selection languages to core MolQL."""

from __future__ import annotations

from typing import Literal

from molviewspec.molql.expression import MolQLExpressionT

LanguageT = Literal["pymol"]


def from_pymol(source: str) -> MolQLExpressionT:
    from molviewspec.molql.pymol import parse

    return parse(source)


def transpile(source: str, *, language: LanguageT) -> MolQLExpressionT:
    if language == "pymol":
        return from_pymol(source)
    raise ValueError(f"Unsupported MolQL source language: {language}")
