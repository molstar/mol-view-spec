/*
 * Copyright (c) 2018-2026 Mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

// deno-lint-ignore-file no-namespace

type Expression =
  | Expression.Literal
  | Expression.Symbol
  | Expression.Apply;

namespace Expression {
  export type Literal = string | number | boolean;
  export type Symbol = { name: string };
  export type Arguments = Expression[] | { [name: string]: Expression };
  export interface Apply {
    readonly head: Expression;
    readonly args?: Arguments;
  }

  export function Symbol(name: string): Expression.Symbol {
    return { name };
  }
  export function Apply(head: Expression, args?: Arguments): Apply {
    return args ? { head, args } : { head };
  }

  export function isArgumentsArray(e?: Arguments): e is Expression[] {
    return !!e && Array.isArray(e);
  }
  export function isArgumentsMap(e?: Arguments): e is { [name: string]: Expression } {
    return !!e && !Array.isArray(e);
  }
  export function isLiteral(e: Expression): e is Expression.Literal {
    return !isApply(e) && !isSymbol(e);
  }
  export function isApply(e: Expression): e is Expression.Apply {
    return !!e && !!(e as Expression.Apply).head && typeof e === "object";
  }
  export function isSymbol(e: Expression): e is Expression.Symbol {
    return !!e && typeof (e as any).name === "string";
  }

  /** Decide if a value has the recursive JSON shape of a MolScript expression. */
  export function is(value: unknown): value is Expression {
    if (typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (isSymbol(value as Expression)) return true;
    const apply = value as Apply;
    if (!Object.prototype.hasOwnProperty.call(apply, "head") || !is(apply.head)) return false;
    if (apply.args === undefined) return true;
    if (Array.isArray(apply.args)) return apply.args.every(is);
    return !!apply.args && typeof apply.args === "object" && Object.values(apply.args).every(is);
  }
}

export interface ValidateExpressionOptions {
  requireApplication?: boolean;
  knownSymbols?: ReadonlySet<string>;
}

export class MolQLValidationError extends Error {
  override readonly name = "MolQLValidationError";
}

/** Validate the JSON shape and application heads of a serialized MolQL expression. */
export function validateExpression(value: unknown, options: ValidateExpressionOptions = {}): Expression {
  if (!Expression.is(value)) {
    throw new MolQLValidationError("Invalid recursive MolQL expression shape");
  }
  if (options.requireApplication && !Expression.isApply(value)) {
    throw new MolQLValidationError("MolQL expression must be an application");
  }
  validateApplications(value, options.knownSymbols);
  return value;
}

function validateApplications(value: Expression, knownSymbols?: ReadonlySet<string>): void {
  if (!Expression.isApply(value)) return;
  if (!Expression.isSymbol(value.head)) {
    throw new MolQLValidationError("MolQL applications can only apply symbols");
  }
  if (knownSymbols && !knownSymbols.has(value.head.name)) {
    throw new MolQLValidationError(`MolQL symbol '${value.head.name}' is not implemented`);
  }
  if (Expression.isArgumentsArray(value.args)) {
    for (const argument of value.args) validateApplications(argument, knownSymbols);
  } else if (Expression.isArgumentsMap(value.args)) {
    for (const argument of Object.values(value.args)) validateApplications(argument, knownSymbols);
  }
}

export { Expression };
