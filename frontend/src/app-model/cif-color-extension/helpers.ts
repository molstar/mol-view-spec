/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Column } from 'molstar/lib/mol-data/db';
import { SortedArray } from 'molstar/lib/mol-data/int';
import { ChainIndex, ElementIndex, Model, ResidueIndex } from 'molstar/lib/mol-model/structure';

import { MultiMap, range, sortIfNeeded } from '../utils';


export type ElementRanges = { from: ElementIndex, to: ElementIndex }[]

export function addRange(ranges: ElementRanges, from: ElementIndex, to: ElementIndex) {
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
}


export type IndicesAndSortings = ReturnType<typeof createIndicesAndSortings>

export function createIndicesAndSortings(model: Model) {
    const h = model.atomicHierarchy;
    const nAtoms = h.atoms._rowCount;
    const nResidues = h.residues._rowCount;
    const nChains = h.chains._rowCount;
    const chainsByLabelEntityId = new MultiMap<string, ChainIndex>();
    const chainsByLabelAsymId = new MultiMap<string, ChainIndex>();
    const chainsByAuthAsymId = new MultiMap<string, ChainIndex>();
    const residuesByChainIndexSortedByLabelSeqId = new Map<ChainIndex, ResidueIndex[]>();
    const residuesByChainIndexSortedByLabelSeqIdValues = new Map<ChainIndex, SortedArray<number>>();
    const residuesByChainIndexSortedByAuthSeqId = new Map<ChainIndex, ResidueIndex[]>();
    const residuesByChainIndexSortedByAuthSeqIdValues = new Map<ChainIndex, SortedArray<number>>();
    const residuesByChainIndexByInsCode = new Map<ChainIndex, MultiMap<string | undefined, ResidueIndex>>();
    const atomsById = new Map<number, ElementIndex>();
    for (let iChain = 0 as ChainIndex; iChain < nChains; iChain++) {
        const label_entity_id = h.chains.label_entity_id.value(iChain);
        const label_asym_id = h.chains.label_asym_id.value(iChain);
        const auth_asym_id = h.chains.auth_asym_id.value(iChain);
        chainsByLabelEntityId.add(label_entity_id, iChain);
        chainsByLabelAsymId.add(label_asym_id, iChain);
        chainsByAuthAsymId.add(auth_asym_id, iChain);

        const iResFrom = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain]];
        const iResTo = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain + 1]] ?? nResidues;
        const residueSortingByLabelSeqId = (range(iResFrom, iResTo) as ResidueIndex[]).filter(iRes => h.residues.label_seq_id.valueKind(iRes) === Column.ValueKind.Present); // TODO maybe implement filterInPlace?
        sortIfNeeded(residueSortingByLabelSeqId, (a, b) => h.residues.label_seq_id.value(a) - h.residues.label_seq_id.value(b) || a - b);
        residuesByChainIndexSortedByLabelSeqId.set(iChain, residueSortingByLabelSeqId);
        residuesByChainIndexSortedByLabelSeqIdValues.set(iChain, SortedArray.ofSortedArray(residueSortingByLabelSeqId.map(iRes => h.residues.label_seq_id.value(iRes))));
        const residueSortingByAuthSeqId = (range(iResFrom, iResTo) as ResidueIndex[]).filter(iRes => h.residues.auth_seq_id.valueKind(iRes) === Column.ValueKind.Present); // TODO maybe implement filterInPlace?
        sortIfNeeded(residueSortingByAuthSeqId, (a, b) => h.residues.auth_seq_id.value(a) - h.residues.auth_seq_id.value(b) || a - b);
        residuesByChainIndexSortedByAuthSeqId.set(iChain, residueSortingByAuthSeqId);
        residuesByChainIndexSortedByAuthSeqIdValues.set(iChain, SortedArray.ofSortedArray(residueSortingByAuthSeqId.map(iRes => h.residues.auth_seq_id.value(iRes))));

        const residuesHereByInsCode = new MultiMap<string | undefined, ResidueIndex>();
        for (let iRes = iResFrom; iRes < iResTo; iRes++) {
            const pdbx_PDB_ins_code = h.residues.pdbx_PDB_ins_code.valueKind(iRes) === Column.ValueKind.Present ? h.residues.pdbx_PDB_ins_code.value(iRes) : undefined;
            residuesHereByInsCode.add(pdbx_PDB_ins_code, iRes);
        }
        residuesByChainIndexByInsCode.set(iChain, residuesHereByInsCode);
    }
    // const residuesByInsCode = new DefaultMap<string | undefined, Set<ResidueIndex>>(() => new Set());
    // for (let iRes = 0 as ResidueIndex; iRes < nResidues; iRes++) {
    //     const pdbx_PDB_ins_code = h.residues.pdbx_PDB_ins_code.value(iRes);
    //     residuesByInsCode.safeGet(pdbx_PDB_ins_code).add(iRes);
    // }
    for (let iAtom = 0 as ElementIndex; iAtom < nAtoms; iAtom++) {
        const atom_id = model.atomicConformation.atomId.value(iAtom);
        atomsById.set(atom_id, iAtom);
    }

    return {
        chainsByLabelEntityId, chainsByLabelAsymId, chainsByAuthAsymId,
        residuesByChainIndexSortedByLabelSeqId, residuesByChainIndexSortedByLabelSeqIdValues,
        residuesByChainIndexSortedByAuthSeqId, residuesByChainIndexSortedByAuthSeqIdValues,
        residuesByChainIndexByInsCode,
        // residuesByInsCode,
        atomsById,
    };
}


export function getResiduesWithValue(residues: ResidueIndex[], values: SortedArray<number>, target: number) {
    return getResiduesWithValueInRange(residues, values, target, target);
}
export function getResiduesWithValueInRange(residues: ResidueIndex[], values: SortedArray<number>, min: number | undefined, max: number | undefined) {
    const n = residues.length;
    const from = (min !== undefined) ? SortedArray.findPredecessorIndex(values, min) : 0;
    let to: number;
    if (max !== undefined) {
        to = from;
        while (to < n && values[to] <= max) to++;
    } else {
        to = n;
    }
    return residues.slice(from, to);
}
