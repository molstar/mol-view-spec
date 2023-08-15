/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ElementIndex } from 'molstar/lib/mol-model/structure';


/** Represents a collection of disjoint atom ranges in a model.
 * Each item represents a contiguous range of atoms,
 * `from` is index of the first included atom, `to` is index of the first atom after the range. */
export type AtomRanges = { from: ElementIndex, to: ElementIndex }[]

/** Create new `AtomRanges` without any atoms */
export function emptyRanges(): AtomRanges {
    return [];
};

/** Create new `AtomRanges` containing a single range of atoms `[from, to)` */
export function singleRange(from: ElementIndex, to: ElementIndex): AtomRanges {
    return [{ from, to }];
};

/** Add a range of atoms `[from, to)` to existing `AtomRanges`.
 * The added range must start after the end of the last existing range (if it starts just on the next atom, these two ranges will get merged). */
export function addRange(ranges: AtomRanges, from: ElementIndex, to: ElementIndex): AtomRanges {
    if (ranges.length > 0) {
        const last = ranges[ranges.length - 1];
        if (from < last.to) throw new Error('Overlapping ranges not allowed');
        if (from === last.to) {
            last.to = to;
        } else {
            ranges.push({ from, to });
        }
    } else {
        ranges.push({ from, to });
    }
    return ranges;
}
