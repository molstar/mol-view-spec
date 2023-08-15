/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Column } from 'molstar/lib/mol-data/db';
import { SortedArray } from 'molstar/lib/mol-data/int';
import { ChainIndex, ElementIndex, Model, ResidueIndex } from 'molstar/lib/mol-model/structure';

import { BasicReadonlyMap, MultiMap, NumberMap, filterInPlace, range, sortIfNeeded } from '../utils';


export type ElementRanges = { from: ElementIndex, to: ElementIndex }[]

export function emptyRanges(): ElementRanges {
    return [];
};
export function singleRange(from: ElementIndex, to: ElementIndex): ElementRanges {
    return [{ from, to }];
};
export function addRange(ranges: ElementRanges, from: ElementIndex, to: ElementIndex): ElementRanges {
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


export interface IndicesAndSortings {
    chainsByLabelEntityId: ReadonlyMap<string, readonly ChainIndex[]>,
    chainsByLabelAsymId: ReadonlyMap<string, readonly ChainIndex[]>,
    chainsByAuthAsymId: ReadonlyMap<string, readonly ChainIndex[]>,
    residuesSortedByLabelSeqId: ReadonlyMap<ChainIndex, Sorting<ResidueIndex, number>>,
    residuesSortedByAuthSeqId: ReadonlyMap<ChainIndex, Sorting<ResidueIndex, number>>,
    residuesByInsCode: ReadonlyMap<ChainIndex, ReadonlyMap<string, readonly ResidueIndex[]>>,
    atomsById: BasicReadonlyMap<number, ElementIndex>,
    atomsByIndex: BasicReadonlyMap<number, ElementIndex>,
}

export function createIndicesAndSortings(model: Model): IndicesAndSortings {
    const h = model.atomicHierarchy;
    const nAtoms = h.atoms._rowCount;
    const nResidues = h.residues._rowCount;
    const nChains = h.chains._rowCount;
    const { label_entity_id, label_asym_id, auth_asym_id } = h.chains;
    const { label_seq_id, auth_seq_id, pdbx_PDB_ins_code } = h.residues;
    const { Present } = Column.ValueKind;

    const chainsByLabelEntityId = new MultiMap<string, ChainIndex>();
    const chainsByLabelAsymId = new MultiMap<string, ChainIndex>();
    const chainsByAuthAsymId = new MultiMap<string, ChainIndex>();
    const residuesSortedByLabelSeqId = new Map<ChainIndex, Sorting<ResidueIndex, number>>();
    const residuesSortedByAuthSeqId = new Map<ChainIndex, Sorting<ResidueIndex, number>>();
    const residuesByInsCode = new Map<ChainIndex, MultiMap<string, ResidueIndex>>();
    const atomsById = new NumberMap<number, ElementIndex>(nAtoms + 1);
    const atomsByIndex = new NumberMap<number, ElementIndex>(nAtoms);

    for (let iChain = 0 as ChainIndex; iChain < nChains; iChain++) {
        chainsByLabelEntityId.add(label_entity_id.value(iChain), iChain);
        chainsByLabelAsymId.add(label_asym_id.value(iChain), iChain);
        chainsByAuthAsymId.add(auth_asym_id.value(iChain), iChain);

        const iResFrom = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain]];
        const iResTo = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain + 1]] ?? nResidues;

        const residuesWithLabelSeqId = filterInPlace(range(iResFrom, iResTo) as ResidueIndex[], iRes => label_seq_id.valueKind(iRes) === Present);
        residuesSortedByLabelSeqId.set(iChain, createSorting(residuesWithLabelSeqId, label_seq_id.value));

        const residuesWithAuthSeqId = filterInPlace(range(iResFrom, iResTo) as ResidueIndex[], iRes => auth_seq_id.valueKind(iRes) === Present);
        residuesSortedByAuthSeqId.set(iChain, createSorting(residuesWithAuthSeqId, auth_seq_id.value));

        const residuesHereByInsCode = new MultiMap<string, ResidueIndex>();
        for (let iRes = iResFrom; iRes < iResTo; iRes++) {
            if (pdbx_PDB_ins_code.valueKind(iRes) === Present) {
                residuesHereByInsCode.add(pdbx_PDB_ins_code.value(iRes), iRes);
            }
        }
        residuesByInsCode.set(iChain, residuesHereByInsCode);
    }

    const atomId = model.atomicConformation.atomId.value;
    const atomIndex = h.atomSourceIndex.value;
    for (let iAtom = 0 as ElementIndex; iAtom < nAtoms; iAtom++) {
        atomsById.set(atomId(iAtom), iAtom);
        atomsByIndex.set(atomIndex(iAtom), iAtom);
    }

    return {
        chainsByLabelEntityId, chainsByLabelAsymId, chainsByAuthAsymId,
        residuesSortedByLabelSeqId,
        residuesSortedByAuthSeqId,
        residuesByInsCode,
        atomsById, atomsByIndex,
    };
}

interface Sorting<TIndex, TValue extends number> {
    keys: readonly TIndex[],
    values: SortedArray<TValue>,
}

/** Create a sorting from an array of keys and a value function.
 * Modifies `keys`! Create a copy if you need the original order! */
function createSorting<K extends number, V extends number>(keys: K[], value: (i: K) => V): Sorting<K, V> {
    sortIfNeeded(keys, (a, b) => value(a) - value(b) || a - b);
    const values: SortedArray<V> = SortedArray.ofSortedArray(keys.map(value));
    return { keys, values };
}

export function getKeysWithValue<K, V extends number>(sorting: Sorting<K, V>, target: V): K[] {
    return getKeysWithValueInRange(sorting, target, target);
}
export function getKeysWithValueInRange<K, V extends number>(sorting: Sorting<K, V>, min: V | undefined, max: V | undefined): K[] {
    const { keys, values } = sorting;
    if (!keys) return [];
    const n = keys.length;
    const from = (min !== undefined) ? SortedArray.findPredecessorIndex(values, min) : 0;
    let to: number;
    if (max !== undefined) {
        to = from;
        while (to < n && values[to] <= max) to++;
    } else {
        to = n;
    }
    return keys.slice(from, to);
}
