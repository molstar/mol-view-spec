/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Column } from 'molstar/lib/mol-data/db';
import { ChainIndex, ElementIndex, Model, ResidueIndex } from 'molstar/lib/mol-model/structure';

import { extend, filterInPlace, range } from '../../utils';
import { AtomRanges, addRange, emptyRanges, singleRange } from '../helpers/atom-ranges';
import { AnnotationRow } from '../schemas';
import { IndicesAndSortings, getKeysWithValue, getKeysWithValueInRange } from './indexing';


const EMPTY_ARRAY: readonly any[] = [];


/** Return atom ranges in `model` which satisfy criteria given by `row` */
export function getAtomRangesForRow(model: Model, row: AnnotationRow, indices: IndicesAndSortings): AtomRanges {
    const h = model.atomicHierarchy;
    const nAtoms = h.atoms._rowCount;

    const hasAtomIds = isAnyDefined(row.atom_id, row.atom_index);
    const hasAtomFilter = isAnyDefined(row.label_atom_id, row.auth_atom_id, row.type_symbol);
    const hasResidueFilter = isAnyDefined(row.label_seq_id, row.auth_seq_id, row.pdbx_PDB_ins_code, row.beg_label_seq_id, row.end_label_seq_id, row.beg_auth_seq_id, row.end_auth_seq_id);
    const hasChainFilter = isAnyDefined(row.label_asym_id, row.auth_asym_id, row.label_entity_id);

    if (hasAtomIds) {
        const theAtom = getTheAtomForRow(model, row, indices);
        return theAtom !== undefined ? singleRange(theAtom, theAtom + 1 as ElementIndex) : emptyRanges();
    }

    if (!hasChainFilter && !hasResidueFilter && !hasAtomFilter) {
        return singleRange(0 as ElementIndex, nAtoms as ElementIndex);
    }

    const qualifyingChains = getQualifyingChains(model, row, indices);
    if (!hasResidueFilter && !hasAtomFilter) {
        const chainOffsets = h.chainAtomSegments.offsets;
        const ranges = emptyRanges();
        for (const iChain of qualifyingChains) {
            addRange(ranges, chainOffsets[iChain], chainOffsets[iChain + 1]);
        }
        return ranges;
    }

    const qualifyingResidues = getQualifyingResidues(model, row, indices, qualifyingChains);
    if (!hasAtomFilter) {
        const residueOffsets = h.residueAtomSegments.offsets;
        const ranges = emptyRanges();
        for (const iRes of qualifyingResidues) {
            addRange(ranges, residueOffsets[iRes], residueOffsets[iRes + 1]);
        }
        return ranges;
    }

    const qualifyingAtoms = getQualifyingAtoms(model, row, indices, qualifyingResidues);
    const ranges = emptyRanges();
    for (const iAtom of qualifyingAtoms) {
        addRange(ranges, iAtom, iAtom + 1 as ElementIndex);
    }
    return ranges;
}


/** Return `true` if `value` is not `undefined` or `null`.
 * Prefer this over `value !== undefined`
 * (for maybe if we want to allow `null` in `AnnotationRow` in the future) */
function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}
/** Return `true` if at least one of `values` is not `undefined` or `null`. */
function isAnyDefined(...values: any[]): boolean {
    return values.some(v => isDefined(v));
}


/** Return an array of chain indexes which satisfy criteria given by `row` */
function getQualifyingChains(model: Model, row: AnnotationRow, indices: IndicesAndSortings): readonly ChainIndex[] {
    const { auth_asym_id, label_entity_id, _rowCount: nChains } = model.atomicHierarchy.chains;
    let result: readonly ChainIndex[] | undefined = undefined;
    if (isDefined(row.label_asym_id)) {
        result = indices.chainsByLabelAsymId.get(row.label_asym_id) ?? EMPTY_ARRAY;
    }
    if (isDefined(row.auth_asym_id)) {
        if (result) {
            result = result.filter(i => auth_asym_id.value(i) === row.auth_asym_id);
        } else {
            result = indices.chainsByAuthAsymId.get(row.auth_asym_id) ?? EMPTY_ARRAY;
        }
    }
    if (isDefined(row.label_entity_id)) {
        if (result) {
            result = result.filter(i => label_entity_id.value(i) === row.label_entity_id);
        } else {
            result = indices.chainsByLabelEntityId.get(row.label_entity_id) ?? EMPTY_ARRAY;
        }
    }
    result ??= range(nChains) as ChainIndex[];
    return result;
}

/** Return an array of residue indexes which satisfy criteria given by `row` */
function getQualifyingResidues(model: Model, row: AnnotationRow, indices: IndicesAndSortings, fromChains: readonly ChainIndex[]): ResidueIndex[] {
    const { label_seq_id, auth_seq_id, pdbx_PDB_ins_code, _rowCount: nResidues } = model.atomicHierarchy.residues;
    const { Present } = Column.ValueKind;
    const result: ResidueIndex[] = [];
    for (const iChain of fromChains) {
        let residuesHere: readonly ResidueIndex[] | undefined = undefined;
        if (isDefined(row.label_seq_id)) {
            const sorting = indices.residuesSortedByLabelSeqId.get(iChain)!;
            residuesHere = getKeysWithValue(sorting, row.label_seq_id);
        }
        if (isDefined(row.auth_seq_id)) {
            if (residuesHere) {
                residuesHere = residuesHere.filter(i => auth_seq_id.valueKind(i) === Present && auth_seq_id.value(i) === row.auth_seq_id);
            } else {
                const sorting = indices.residuesSortedByAuthSeqId.get(iChain)!;
                residuesHere = getKeysWithValue(sorting, row.auth_seq_id);
            }
        }
        if (isDefined(row.pdbx_PDB_ins_code)) {
            if (residuesHere) {
                residuesHere = residuesHere.filter(i => pdbx_PDB_ins_code.value(i) === row.pdbx_PDB_ins_code);
            } else {
                residuesHere = indices.residuesByInsCode.get(iChain)!.get(row.pdbx_PDB_ins_code) ?? EMPTY_ARRAY;
            }
        }
        if (isDefined(row.beg_label_seq_id) || isDefined(row.end_label_seq_id)) {
            if (residuesHere) {
                if (isDefined(row.beg_label_seq_id)) {
                    residuesHere = residuesHere.filter(i => label_seq_id.valueKind(i) === Present && label_seq_id.value(i) >= row.beg_label_seq_id!);
                }
                if (isDefined(row.end_label_seq_id)) {
                    residuesHere = residuesHere.filter(i => label_seq_id.valueKind(i) === Present && label_seq_id.value(i) <= row.end_label_seq_id!);
                }
            } else {
                const sorting = indices.residuesSortedByLabelSeqId.get(iChain)!;
                residuesHere = getKeysWithValueInRange(sorting, row.beg_label_seq_id, row.end_label_seq_id);
            }
        }
        if (isDefined(row.beg_auth_seq_id) || isDefined(row.end_auth_seq_id)) {
            if (residuesHere) {
                if (isDefined(row.beg_auth_seq_id)) {
                    residuesHere = residuesHere.filter(i => auth_seq_id.valueKind(i) === Present && auth_seq_id.value(i) >= row.beg_auth_seq_id!);
                }
                if (isDefined(row.end_auth_seq_id)) {
                    residuesHere = residuesHere.filter(i => auth_seq_id.valueKind(i) === Present && auth_seq_id.value(i) <= row.end_auth_seq_id!);
                }
            } else {
                const sorting = indices.residuesSortedByAuthSeqId.get(iChain)!;
                residuesHere = getKeysWithValueInRange(sorting, row.beg_auth_seq_id, row.end_auth_seq_id);
            }
        }
        if (!residuesHere) {
            const { residueAtomSegments, chainAtomSegments } = model.atomicHierarchy;
            const firstResidueForChain = residueAtomSegments.index[chainAtomSegments.offsets[iChain]];
            const firstResidueAfterChain = residueAtomSegments.index[chainAtomSegments.offsets[iChain + 1]] ?? nResidues;
            residuesHere = range(firstResidueForChain, firstResidueAfterChain) as ResidueIndex[];
        }
        extend(result, residuesHere);
    }
    return result;
}

/** Return an array of atom indexes which satisfy criteria given by `row` */
function getQualifyingAtoms(model: Model, row: AnnotationRow, indices: IndicesAndSortings, fromResidues: readonly ResidueIndex[]): ElementIndex[] {
    const { label_atom_id, auth_atom_id, type_symbol } = model.atomicHierarchy.atoms;
    const residueAtomSegments_offsets = model.atomicHierarchy.residueAtomSegments.offsets;
    const result: ElementIndex[] = [];
    for (const iRes of fromResidues) {
        const atomIdcs = range(residueAtomSegments_offsets[iRes], residueAtomSegments_offsets[iRes + 1]) as ElementIndex[];
        if (isDefined(row.label_atom_id)) {
            filterInPlace(atomIdcs, iAtom => label_atom_id.value(iAtom) === row.label_atom_id);
        }
        if (isDefined(row.auth_atom_id)) {
            filterInPlace(atomIdcs, iAtom => auth_atom_id.value(iAtom) === row.auth_atom_id);
        }
        if (isDefined(row.type_symbol)) {
            filterInPlace(atomIdcs, iAtom => type_symbol.value(iAtom) === row.type_symbol);
        }
        extend(result, atomIdcs);
    }
    return result;
}

/** Return index of atom in `model` which satistfies criteria given by `row`, if any.
 * Only works when `row.atom_id` and/or `row.atom_index` is defined (otherwise use `getAtomRangesForRow`). */
function getTheAtomForRow(model: Model, row: AnnotationRow, indices: IndicesAndSortings): ElementIndex | undefined {
    let iAtom: ElementIndex | undefined = undefined;
    if (!isDefined(row.atom_id) && !isDefined(row.atom_index)) throw new Error('ArgumentError: at least one of row.atom_id, row.atom_index must be defined.');
    if (isDefined(row.atom_id) && isDefined(row.atom_index)) {
        const a1 = indices.atomsById.get(row.atom_id);
        const a2 = indices.atomsByIndex.get(row.atom_index);
        if (a1 !== a2) return undefined;
        iAtom = a1;
    }
    if (isDefined(row.atom_id)) {
        iAtom = indices.atomsById.get(row.atom_id);
    }
    if (isDefined(row.atom_index)) {
        iAtom = indices.atomsByIndex.get(row.atom_index);
    }
    if (iAtom === undefined) return undefined;
    if (!atomQualifies(model, iAtom, row)) return undefined;
    return iAtom;
}

/** Return true if `iAtom`-th atom in `model` satisfies all selection criteria given by `row`. */
export function atomQualifies(model: Model, iAtom: ElementIndex, row: AnnotationRow): boolean {
    const h = model.atomicHierarchy;

    const iChain = h.chainAtomSegments.index[iAtom];
    const label_asym_id = h.chains.label_asym_id.value(iChain);
    const auth_asym_id = h.chains.auth_asym_id.value(iChain);
    const label_entity_id = h.chains.label_entity_id.value(iChain);
    if (!matches(row.label_asym_id, label_asym_id)) return false;
    if (!matches(row.auth_asym_id, auth_asym_id)) return false;
    if (!matches(row.label_entity_id, label_entity_id)) return false;

    const iRes = h.residueAtomSegments.index[iAtom];
    const label_seq_id = (h.residues.label_seq_id.valueKind(iRes) === Column.ValueKind.Present) ? h.residues.label_seq_id.value(iRes) : undefined;
    const auth_seq_id = (h.residues.auth_seq_id.valueKind(iRes) === Column.ValueKind.Present) ? h.residues.auth_seq_id.value(iRes) : undefined;
    const pdbx_PDB_ins_code = h.residues.pdbx_PDB_ins_code.value(iRes);
    if (!matches(row.label_seq_id, label_seq_id)) return false;
    if (!matches(row.auth_seq_id, auth_seq_id)) return false;
    if (!matches(row.pdbx_PDB_ins_code, pdbx_PDB_ins_code)) return false;
    if (!matchesRange(row.beg_label_seq_id, row.end_label_seq_id, label_seq_id)) return false;
    if (!matchesRange(row.beg_auth_seq_id, row.end_auth_seq_id, auth_seq_id)) return false;

    const label_atom_id = h.atoms.label_atom_id.value(iAtom);
    const auth_atom_id = h.atoms.auth_atom_id.value(iAtom);
    const type_symbol = h.atoms.type_symbol.value(iAtom);
    const atom_id = model.atomicConformation.atomId.value(iAtom);
    const atom_index = h.atomSourceIndex.value(iAtom);
    if (!matches(row.label_atom_id, label_atom_id)) return false;
    if (!matches(row.auth_atom_id, auth_atom_id)) return false;
    if (!matches(row.type_symbol, type_symbol)) return false;
    if (!matches(row.atom_id, atom_id)) return false;
    if (!matches(row.atom_index, atom_index)) return false;

    return true;
}

/** Return true if `value` equals `requiredValue` or if `requiredValue` if not defined.  */
function matches<T>(requiredValue: T | undefined | null, value: T | undefined): boolean {
    return !isDefined(requiredValue) || value === requiredValue;
}

/** Return true if `requiredMin <= value <= requiredMax`.
 * Undefined `requiredMin` behaves like negative infinity.
 * Undefined `requiredMax` behaves like positive infinity. */
function matchesRange<T>(requiredMin: T | undefined | null, requiredMax: T | undefined | null, value: T | undefined): boolean {
    if (isDefined(requiredMin) && (!isDefined(value) || value < requiredMin)) return false;
    if (isDefined(requiredMax) && (!isDefined(value) || value > requiredMax)) return false;
    return true;
}
