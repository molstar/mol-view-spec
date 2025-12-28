/**
 * Utility functions for MolViewSpec
 */

export const VERSION = "1.8.1";

/**
 * Generate a UUID v4.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in ISO 8601 format with UTC timezone.
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get major version tag (e.g., "1.8" from "1.8.0").
 */
export function getMajorVersionTag(): string {
  return VERSION;
}

/**
 * Remove null and undefined values from an object recursively.
 */
export function excludeNone(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj.map(excludeNone).filter((item) => item !== undefined);
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const processed = excludeNone(value);
      if (processed !== undefined) {
        result[key] = processed;
      }
    }
    return result;
  }

  return obj;
}

/**
 * Make params object by merging values and ensuring only valid fields are included.
 */
export function makeParams<T extends Record<string, unknown>>(
  values?: Record<string, unknown>,
  moreValues?: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};

  // Propagate custom properties
  if (values?.custom !== undefined) {
    result.custom = values.custom;
  }
  if (values?.ref !== undefined) {
    result.ref = values.ref;
  }

  // Merge values
  if (values) {
    for (const [key, value] of Object.entries(values)) {
      if (key !== "custom" && key !== "ref" && value !== undefined) {
        result[key] = value;
      }
    }
  }

  // Merge moreValues
  if (moreValues) {
    for (const [key, value] of Object.entries(moreValues)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result as T;
}
