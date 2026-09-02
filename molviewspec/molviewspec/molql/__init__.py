"""Build, wrap, and transpile JSON-native MolQL expressions."""

from __future__ import annotations

from typing import TYPE_CHECKING

from molviewspec.molql.builder import (
    MS,
    AtomCorePropertyT,
    AtomMacromolecularPropertyT,
    AtomTopologyPropertyT,
    MolScriptBuilder,
)
from molviewspec.molql.expression import (
    MolQLApplyT,
    MolQLArgumentsT,
    MolQLExpressionT,
    MolQLLiteralT,
    MolQLSymbolT,
    MolQLValidationError,
    apply,
    is_apply,
    is_expression,
    is_symbol,
    symbol,
    validate_expression,
)
from molviewspec.molql.language import AtomGroupsArgsT, core, struct
from molviewspec.molql.transpile import LanguageT, from_pymol, transpile

if TYPE_CHECKING:
    from molviewspec.nodes import MolQLExpression, PrimitiveMolQLExpression


# Expose the base-language builder directly on the canonical ``molql`` namespace.
atom_name = MolScriptBuilder.atom_name
es = MolScriptBuilder.es
list = MolScriptBuilder.list
set = MolScriptBuilder.set
re = MolScriptBuilder.re
fn = MolScriptBuilder.fn
evaluate = MolScriptBuilder.evaluate
acp = MolScriptBuilder.acp
atp = MolScriptBuilder.atp
ammp = MolScriptBuilder.ammp
acp_set = MolScriptBuilder.acp_set
atp_set = MolScriptBuilder.atp_set
ammp_set = MolScriptBuilder.ammp_set


def selector(expression: MolQLExpressionT) -> MolQLExpression:
    """Wrap a base MolQL expression for use as an MVS component or color selector."""

    from molviewspec.nodes import MolQLExpression

    return MolQLExpression(molql=expression)


def position(
    expression: MolQLExpressionT,
    *,
    structure_ref: str | None = None,
) -> PrimitiveMolQLExpression:
    """Wrap a base MolQL expression for use as an MVS primitive position."""

    from molviewspec.nodes import PrimitiveMolQLExpression

    return PrimitiveMolQLExpression(molql=expression, structure_ref=structure_ref)


__all__ = [
    "MS",
    "AtomCorePropertyT",
    "AtomGroupsArgsT",
    "AtomMacromolecularPropertyT",
    "AtomTopologyPropertyT",
    "LanguageT",
    "MolQLApplyT",
    "MolQLArgumentsT",
    "MolQLExpressionT",
    "MolQLLiteralT",
    "MolQLSymbolT",
    "MolQLValidationError",
    "MolScriptBuilder",
    "acp",
    "acp_set",
    "ammp",
    "ammp_set",
    "apply",
    "atom_name",
    "atp",
    "atp_set",
    "core",
    "es",
    "evaluate",
    "fn",
    "from_pymol",
    "is_apply",
    "is_expression",
    "is_symbol",
    "list",
    "position",
    "re",
    "selector",
    "set",
    "symbol",
    "struct",
    "transpile",
    "validate_expression",
]
