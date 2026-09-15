/** JSON-native MolQL expressions, builders, and MVS wrappers. */

import { MolScriptBuilder } from "./builder.ts";
import { Expression, MolQLValidationError, validateExpression } from "./expression.ts";
import { SymbolList } from "./language/symbol-table.ts";

export { Expression, MolQLValidationError, MolScriptBuilder, validateExpression };
export type { ValidateExpressionOptions } from "./expression.ts";

/** An MVS component or color selector wrapping a base MolQL expression. */
export interface MolQLExpression {
  molql: Expression;
}

/** A MolQL primitive position, optionally evaluated against another structure. */
export interface PrimitiveMolQLExpression extends MolQLExpression {
  structure_ref?: string;
}

const knownSymbols = new Set(SymbolList.map((symbol) => symbol.id));

// Expose the base-language builder directly on the canonical `molql` namespace.
export const core = MolScriptBuilder.core;
export const struct = MolScriptBuilder.struct;
export const atomName = MolScriptBuilder.atomName;
export const es = MolScriptBuilder.es;
export const list = MolScriptBuilder.list;
export const set = MolScriptBuilder.set;
export const re = MolScriptBuilder.re;
export const fn = MolScriptBuilder.fn;
export const evaluate = MolScriptBuilder.evaluate;
export const acp = MolScriptBuilder.acp;
export const atp = MolScriptBuilder.atp;
export const ammp = MolScriptBuilder.ammp;
export const acpSet = MolScriptBuilder.acpSet;
export const atpSet = MolScriptBuilder.atpSet;
export const ammpSet = MolScriptBuilder.ammpSet;

/** Wrap a base MolQL expression for use as an MVS component or color selector. */
export function selector(expression: Expression): MolQLExpression {
  return {
    molql: validateExpression(expression, {
      requireApplication: true,
      knownSymbols,
    }),
  };
}

/** Wrap a base MolQL expression for use as an MVS primitive position. */
export function position(
  expression: Expression,
  structureRef?: string,
): PrimitiveMolQLExpression {
  const result: PrimitiveMolQLExpression = {
    molql: validateExpression(expression, {
      requireApplication: true,
      knownSymbols,
    }),
  };
  if (structureRef !== undefined) result.structure_ref = structureRef;
  return result;
}
