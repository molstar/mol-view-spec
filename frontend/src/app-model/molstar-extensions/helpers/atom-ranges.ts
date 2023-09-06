/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ElementIndex } from 'molstar/lib/mol-model/structure';


/** Represents a collection of disjoint atom ranges in a model.
 * Each item represents a contiguous range of atoms,
 * `from` is index of the first included atom, `to` is index of the first atom after the range. */
export type AtomRanges = { from: ElementIndex[], to: ElementIndex[] }

/** Create new `AtomRanges` without any atoms */
export function emptyRanges(): AtomRanges {
    return { from: [], to: [] };
};

/** Create new `AtomRanges` containing a single range of atoms `[from, to)` */
export function singleRange(from: ElementIndex, to: ElementIndex): AtomRanges {
    return { from: [from], to: [to] };
};

/** Add a range of atoms `[from, to)` to existing `AtomRanges`.
 * The added range must start after the end of the last existing range (if it starts just on the next atom, these two ranges will get merged). */
export function addRange(ranges: AtomRanges, from: ElementIndex, to: ElementIndex): AtomRanges {
    const n = ranges.from.length;
    if (n > 0) {
        const lastTo = ranges.to[n - 1];
        if (from < lastTo) throw new Error('Overlapping ranges not allowed');
        if (from === lastTo) {
            ranges.to[n - 1] = to;
        } else {
            ranges.from.push(from);
            ranges.to.push(to);
        }
    } else {
        ranges.from.push(from);
        ranges.to.push(to);
    }
    return ranges;
}

export function rangesForeach(ranges: AtomRanges, func: (from: ElementIndex, to: ElementIndex) => any) {
    const n = ranges.from.length;
    for (let i = 0; i < n; i++) func(ranges.from[i], ranges.to[i]);
}
export function rangesMap<T>(ranges: AtomRanges, func: (from: ElementIndex, to: ElementIndex) => T): T[] {
    const n = ranges.from.length;
    const result: T[] = new Array(n);
    for (let i = 0; i < n; i++) result[i] = func(ranges.from[i], ranges.to[i]);
    return result;
}