/** Eager PyMOL-selection transpilation to base MolQL JSON expressions. */

import { Expression, validateExpression } from "../../expression.ts";
import { SymbolList } from "../../language/symbol-table.ts";
import { transpiler } from "./parser.ts";

const knownSymbols = new Set(SymbolList.map((symbol) => symbol.id));

/** Eagerly transpile a PyMOL selection to a base MolQL JSON expression. */
export function transpile(source: string): Expression {
  if (!source.trim()) throw new Error("PyMOL selection must not be empty");
  return validateExpression(transpiler(source), {
    requireApplication: true,
    knownSymbols,
  });
}
