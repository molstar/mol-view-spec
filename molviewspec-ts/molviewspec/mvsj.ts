/**
 * MVSJ (MolViewSpec JSON) serialization and deserialization.
 */

import type { MVSData, Node, State, States } from "./nodes.ts";
import { findRef, validateStateTree } from "./nodes.ts";
import { excludeNone } from "./utils.ts";

/**
 * MVSJ class for handling JSON serialization.
 */
export class MVSJ {
  data: MVSData;

  constructor(data: MVSData) {
    this.data = data;
  }

  /**
   * Convert to a dictionary representation.
   */
  toDict(): Record<string, unknown> {
    return excludeNone(this.data) as Record<string, unknown>;
  }

  /**
   * Serialize the data to a JSON string.
   */
  dumps(indent = 2): string {
    const cleaned = excludeNone(this.data);
    return JSON.stringify(cleaned, null, indent);
  }

  /**
   * Write the serialized data to a file.
   */
  async dump(filename: string): Promise<void> {
    const content = this.dumps();
    await Deno.writeTextFile(filename, content);
  }

  /**
   * Find a child node by reference.
   */
  findRef(ref: string): Node | null {
    if ("root" in this.data) {
      return findRef(this.data.root, ref);
    }
    throw new Error("Cannot find ref in MVSJ with multiple states");
  }

  /**
   * Deserialize a JSON string or object to a MVSJ object.
   */
  static loads(data: string | Record<string, unknown>): MVSJ {
    let parsed: Record<string, unknown>;

    if (typeof data === "string") {
      parsed = JSON.parse(data);
    } else {
      parsed = data;
    }

    if (!validateStateTree(parsed as unknown as MVSData)) {
      throw new Error("Invalid state tree structure");
    }

    return new MVSJ(parsed as unknown as MVSData);
  }

  /**
   * Load MVSJ object from a file.
   */
  static async load(filename: string): Promise<MVSJ> {
    const content = await Deno.readTextFile(filename);
    return MVSJ.loads(content);
  }
}

/**
 * Convert State to MVSJ.
 */
export function stateToMVSJ(state: State): MVSJ {
  return new MVSJ(state);
}

/**
 * Convert States to MVSJ.
 */
export function statesToMVSJ(states: States): MVSJ {
  return new MVSJ(states);
}
