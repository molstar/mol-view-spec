/**
 * Copyright (c) 2017 Mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { normalizeTable, symbolList } from "./helpers.ts";
import { MSymbol } from "./symbol.ts";
import { core } from "./symbol-table/core.ts";
import { structureQuery } from "./symbol-table/structure-query.ts";

/** The state-safe base MolQL language used by MolViewSpec. */
const MolScriptSymbolTable = { core, structureQuery };

normalizeTable(MolScriptSymbolTable);

export const SymbolList = symbolList(MolScriptSymbolTable);

export const SymbolMap = (() => {
  const map: Record<string, MSymbol | undefined> = Object.create(null);
  for (const symbol of SymbolList) map[symbol.id] = symbol;
  return map;
})();

export { MolScriptSymbolTable };
