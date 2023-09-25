import { hashString } from 'molstar/lib/mol-data/util';


export function formatObject(obj: {} | undefined) {
    if (!obj) return 'undefined';
    return JSON.stringify(obj).replace(/,("\w+":)/g, ', $1').replace(/"(\w+)":/g, '$1: ');
}

/** Return an object with keys `keys` and their values same as in `obj` */
export function pickObjectKeys<T extends {}, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result: Partial<Pick<T, K>> = {};
    for (const key of keys) {
        if (Object.hasOwn(obj, key)) {
            result[key] = obj[key];
        }
    }
    return result as Pick<T, K>;
}

/** Return an object same as `obj` but without keys `keys` */
export function omitObjectKeys<T extends {}, K extends keyof T>(obj: T, omitKeys: K[]): Omit<T, K> {
    const result: T = { ...obj };
    for (const key of omitKeys) {
        delete result[key];
    }
    return result as Omit<T, K>;
}

/** Return an array containing integers from [start, end) if `end` is given,
 * or from [0, start) if `end` is omitted. */
export function range(start: number, end?: number): number[] {
    if (end === undefined) {
        end = start;
        start = 0;
    }
    const length = Math.max(end - start, 0);
    const result = Array(length);
    for (let i = 0; i < length; i++) {
        result[i] = start + i;
    }
    return result;
}

/** Copy all elements from `src` to the end of `dst`.
 * Equivalent to `dst.push(...src)`, but avoids storing element on call stack. Faster that `extend` from Underscore.js.
 * `extend(a, a)` will double the array
 */
export function extend<T>(dst: T[], src: ArrayLike<T>): void {
    const offset = dst.length;
    const nCopy = src.length;
    dst.length += nCopy;
    for (let i = 0; i < nCopy; i++) {
        dst[offset + i] = src[i];
    }
}

export function sortIfNeeded<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
    const n = array.length;
    for (let i = 1; i < array.length; i++) {
        if (compareFn(array[i - 1], array[i]) > 0) {
            return array.sort(compareFn);
        }
    }
    return array;
}

/** Return a slice of `array` starting at the first element fulfilling `fromPredicate`
 * up to the last element thenceforward ;) fulfilling `whilePredicate`.
 * E.g. `takeFromWhile([1,2,3,4,6,2,5,6], x => x>=4, x => x%2===0)` -> `[4,6,2]` */
export function takeFromWhile<T>(array: T[], fromPredicate: (x: T) => boolean, whilePredicate: (x: T) => boolean): T[] {
    const start = array.findIndex(fromPredicate);
    if (start < 0) return []; // no elements fulfil fromPredicate
    const n = array.length;
    let stop = start;
    while (stop < n && whilePredicate(array[stop])) stop++;
    return array.slice(start, stop);
}
/** Return a slice of `array` starting at `fromIndex`
 * up to the last element thenceforward ;) fulfilling `whilePredicate`. */
export function takeWhile<T>(array: T[], whilePredicate: (x: T) => boolean, fromIndex: number = 0): T[] {
    const n = array.length;
    let stop = fromIndex;
    while (stop < n && whilePredicate(array[stop])) stop++;
    return array.slice(fromIndex, stop);
}
/** Remove all elements from the array which do not fulfil `predicate`. Return the modified array itself. */
export function filterInPlace<T>(array: T[], predicate: (x: T) => boolean): T[] {
    const n = array.length;
    let iDest = 0;
    for (let iSrc = 0; iSrc < n; iSrc++) {
        if (predicate(array[iSrc])) {
            array[iDest++] = array[iSrc];
        }
    }
    array.length = iDest;
    return array;
}

export function foreachOfGenerator<T>(items: Generator<T>, func: (item: T) => any) {
    while (true) {
        const next = items.next();
        if (next.done) return;
        func(next.value);
    }
}

/** Create an object from keys and values (first key maps to first value etc.) */
export function objectFromKeysAndValues<K extends keyof any, V>(keys: K[], values: V[]): Record<K, V> {
    const obj: Partial<Record<K, V>> = {};
    for (let i = 0; i < keys.length; i++) {
        obj[keys[i]] = values[i];
    }
    return obj as Record<K, V>;
}

export function mapArrToObj<K extends keyof any, V>(array: readonly K[], getValue: (key: K) => V): Record<K, V> {
    const result = {} as Record<K, V>;
    for (const key of array) {
        result[key] = getValue(key);
    }
    return result;
}

/** Like `Promise.all` but with objects instead of arrays */
export async function promiseAllObj<T extends {}>(promisesObj: { [key in keyof T]: Promise<T[key]> }): Promise<T> {
    const keys = Object.keys(promisesObj);
    const promises = Object.values(promisesObj);
    const results = await Promise.all(promises);
    return objectFromKeysAndValues(keys, results) as any;
}


export class DefaultMap<K, V> extends Map<K, V> {
    constructor(public defaultFactory: (key: K) => V) {
        super();
    }
    /** Return the same as `this.get(key)` if `key` is present.
     * Set `key`'s value to `this.defaultFactory(key)` and return it if `key` is not present.
     */
    safeGet(key: K): V {
        if (!this.has(key)) {
            this.set(key, this.defaultFactory(key));
        }
        return this.get(key)!;
    }
}

export class MultiMap<K, V> extends Map<K, V[]> {
    add(key: K, value: V) {
        if (!this.has(key)) {
            this.set(key, []);
        }
        this.get(key)!.push(value);
    }
}

/** Implementation of `Map` where keys are integers
 * and most keys are expected to be from interval `[0, limit)`.
 * For the keys within this interval, performance is better than `Map` (implemented by array).
 * For the keys out of this interval, performance is slightly worse than `Map`. */
export class NumberMap<K extends number, V> {
    private array: V[];
    private map: Map<K, V>;
    constructor(public readonly limit: K) {
        this.array = new Array(limit);
        this.map = new Map();
    }
    get(key: K): V | undefined {
        if (0 <= key && key < this.limit) return this.array[key];
        else return this.map.get(key);
    }
    set(key: K, value: V): void {
        if (0 <= key && key < this.limit) this.array[key] = value;
        else this.map.set(key, value);
    }
}
export type BasicReadonlyMap<K, V> = Pick<Map<K, V>, 'get'>

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined }


/** Decide if `obj` is a good old object (not array or null or other type). */
function isReallyObject(obj: any): boolean {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/** Return a copy of object `obj` with sorted keys and dropped keys whose value is undefined. */
export function sortObjectKeys<T extends {}>(obj: T): T {
    const result = {} as T;
    for (const key of Object.keys(obj).sort() as (keyof T)[]) {
        const value = obj[key];
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

/** Return a canonical string representation for a JSON-able object,
 * independent from object key order and undefined properties. */
export function canonicalJsonString(obj: Json) {
    return JSON.stringify(obj, (key, value) => isReallyObject(value) ? sortObjectKeys(value) : value);
}

/** Return an array of all distinct values from `values`
 * (i.e. with removed duplicates).
 * Uses deep equality for objects and arrays,
 * independent from object key order and undefined properties.
 * E.g. {a: 1, b: undefined, c: {d: [], e: null}} is equal to {c: {e: null, d: []}}, a: 1}.
 * If two or more objects in `values` are equal, only the first of them will be in the result. */
export function distinct<T extends Json>(values: T[]): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const value of values) {
        const key = canonicalJsonString(value);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(value);
        }
    }
    return result;
}


/** Return `true` if `value` is not `undefined` or `null`.
 * Prefer this over `value !== undefined`
 * (for maybe if we want to allow `null` in `AnnotationRow` in the future) */
export function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}
/** Return `true` if at least one of `values` is not `undefined` or `null`. */
export function isAnyDefined(...values: any[]): boolean {
    return values.some(v => isDefined(v));
}
/** Return filtered array containing all original elements except `undefined` or `null`. */
export function filterDefined<T>(elements: (T | undefined | null)[]): T[] {
    return elements.filter(x => x !== undefined && x !== null) as T[];
}

/** Create an 8-hex-character hash for a given input string, e.g. 'spanish inquisition' -> 'bd65e59a' */
export function stringHash(input: string): string {
    const uint32hash = hashString(input) >>> 0; // >>>0 converts to uint32, LOL
    return uint32hash.toString(16).padStart(8, '0');
}

/** Return type of elements in a set */
export type ElementOfSet<S> = S extends Set<infer T> ? T : never
