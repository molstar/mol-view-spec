/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ElementIndex } from 'molstar/lib/mol-model/structure';
import { extend, range } from '../../utils';
import { SortedArray } from 'molstar/lib/mol-data/int';


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

export function unionOfRanges(ranges: AtomRanges[]): AtomRanges {
    const concat = emptyRanges();
    for (const r of ranges) {
        extend(concat.from, r.from);
        extend(concat.to, r.to);
    }
    const indices = range(concat.from.length).sort((i, j) => concat.from[i] - concat.from[j]); // sort by start of range
    const result = emptyRanges();
    let last = -1;
    for (const i of indices) {
        const from = concat.from[i];
        const to = concat.to[i];
        if (last >= 0 && from <= result.to[last]) {
            if (to > result.to[last]) {
                result.to[last] = to;
            }
        } else {
            result.from.push(from);
            result.to.push(to);
            last++;
        }
    }
    return result;
}

/** Return a sorted subset of `atoms` which lie in any of `ranges`.
 * If `out` is provided, use it to store the result (clear any old contents).
 * If `outFirstAtomIndex` is provided, fill `outFirstAtomIndex.value` with the index of the first selected atom (if any). */
export function selectAtomsInRanges(atoms: SortedArray<ElementIndex>, ranges: AtomRanges, out?: ElementIndex[], outFirstAtomIndex: { value?: number } = {}): ElementIndex[] {
    out ??= [];
    out.length = 0;
    outFirstAtomIndex.value = undefined;

    const nAtoms = atoms.length;
    const nRanges = ranges.from.length;
    // console.log('nAtoms', nAtoms, 'nRanges', nRanges)
    if (nAtoms <= nRanges) {
        // console.log('Implementation 1 (fewer atoms)')
        let iRange = SortedArray.findPredecessorIndex(SortedArray.ofSortedArray(ranges.to), atoms[0] + 1);
        for (let iAtom = 0; iAtom < nAtoms; iAtom++) {
            const a = atoms[iAtom];
            while (iRange < nRanges && ranges.to[iRange] <= a) iRange++;
            const qualifies = iRange < nRanges && ranges.from[iRange] <= a;
            if (qualifies) {
                out.push(a);
                outFirstAtomIndex.value ??= iAtom;
            }
        }
    } else {
        // console.log('Implementation 2 (fewer ranges)')
        for (let iRange = 0; iRange < nRanges; iRange++) {
            const from = ranges.from[iRange];
            const to = ranges.to[iRange];
            for (let iAtom = SortedArray.findPredecessorIndex(atoms, from); iAtom < nAtoms; iAtom++) {
                const a = atoms[iAtom];
                if (a < to) {
                    out.push(a);
                    outFirstAtomIndex.value ??= iAtom;
                } else {
                    break;
                }
            }
        }
    }
    return out;
}