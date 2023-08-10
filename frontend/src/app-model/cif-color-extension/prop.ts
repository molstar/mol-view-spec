/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';
import { Column } from 'molstar/lib/mol-data/db';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { ChainIndex, ElementIndex, Model, ResidueIndex } from 'molstar/lib/mol-model/structure';
import { StructureElement } from 'molstar/lib/mol-model/structure/structure';
import { Asset } from 'molstar/lib/mol-util/assets';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { DefaultMap, extend, filterInPlace, promiseAllObj, range } from '../utils';
import { ElementRanges, IndicesAndSortings, addRange, createIndicesAndSortings, getResiduesWithValue, getResiduesWithValueInRange } from './helpers';


export const AnnotationFormat = new Choice({ json: 'json', cif: 'cif', bcif: 'bcif' }, 'json');
export type AnnotationFormat = Choice.Values<typeof AnnotationFormat>
export const AnnotationFormatTypes = { json: 'string', cif: 'string', bcif: 'binary' } as const satisfies { [format in AnnotationFormat]: 'string' | 'binary' };

export const AnnotationsParams = {
    annotationSources: PD.ObjectList(
        {
            url: PD.Text(''),
            format: AnnotationFormat.PDSelect(),
        },
        obj => obj.url
    ),
};
export type AnnotationsParams = typeof AnnotationsParams
export type AnnotationsProps = PD.Values<AnnotationsParams>
export type AnnotationsSource = { url: string, format: AnnotationFormat }


export const AnnotationsProvider: CustomModelProperty.Provider<AnnotationsParams, Annotations> = CustomModelProperty.createProvider({
    label: 'Annotations',
    descriptor: CustomPropertyDescriptor<any, any>({
        name: 'annotations',
    }),
    type: 'static',
    defaultParams: AnnotationsParams,
    getParams: (data: Model) => AnnotationsParams,
    isApplicable: (data: Model) => true,
    obtain: async (ctx: CustomProperty.Context, data: Model, props: Partial<AnnotationsProps>) => {
        const p = { ...PD.getDefaultValues(AnnotationsParams), ...props };
        const sources: AnnotationsSource[] = props.annotationSources ?? [];
        const annots = await Annotation.fromSources(ctx, sources);
        console.log('obtain: annotation sources:', props.annotationSources);
        console.log('obtain: annotation data:', annots);
        return { value: annots } satisfies CustomProperty.Data<Annotations>;
    }
});

interface AnnotationRow {
    label_entity_id?: string,
    label_asym_id?: string,
    auth_asym_id?: string,
    label_seq_id?: number,
    auth_seq_id?: number,
    pdbx_PDB_ins_code?: string,
    beg_label_seq_id?: number,
    end_label_seq_id?: number,
    beg_auth_seq_id?: number,
    end_auth_seq_id?: number,
    /** Atom name like 'CA', 'N', 'O'... */
    label_atom_id?: string,
    /** Atom name like 'CA', 'N', 'O'... */
    auth_atom_id?: string,
    /** Unique atom identifier across conformations (_atom_site.id) */
    atom_id?: number,
    /** 0-base index of the atom in the source data */
    atom_index?: number,
    color?: string,
    tooltip?: string,
}

type AnnotationData = { format: 'json', data: string } | { format: 'cif', data: string } | { format: 'bcif', data: Uint8Array }

type Annotations = { [url: string]: Annotation }

class Annotation {
    /** Store ElementIndex->AnnotationRow mapping for each Model */
    private indexedModels = new DefaultMap<Model, (AnnotationRow | undefined)[]>(model => this.rowForAllElements(model));

    constructor(public data: AnnotationData) { }

    static async fromSource(ctx: CustomProperty.Context, source: AnnotationsSource): Promise<Annotation> {
        const url = Asset.getUrlAsset(ctx.assetManager, source.url);
        const dataType = AnnotationFormatTypes[source.format];
        const dataWrapper = await ctx.assetManager.resolve(url, dataType).runInContext(ctx.runtime);
        const data = dataWrapper.data;
        if (!data) throw new Error('missing data');
        return new Annotation({ format: source.format, data } as AnnotationData);
    }
    static async fromSources(ctx: CustomProperty.Context, sources: AnnotationsSource[]): Promise<Annotations> {
        const promises: { [url: string]: Promise<Annotation> } = {};
        for (const source of sources) {
            promises[source.url] = this.fromSource(ctx, source);
        }
        const annotations: Annotations = await promiseAllObj(promises);
        console.log('fromSources:', annotations);
        return annotations;
    }
    getRows(): AnnotationRow[] {
        const rows: AnnotationRow[] = [];
        if (this.data.format === 'json') {
            const js = JSON.parse(this.data.data);
            if (Array.isArray(js)) {
                // array of objects
                for (const item of js) {
                    rows.push(item);
                }
            } else {
                // object of arrays
                const keys = Object.keys(js);
                if (keys.length > 0) {
                    const n = js[keys[0]].length;
                    for (const key of keys) if (js[key].length !== n) throw new Error('FormatError: arrays must have the same length.');
                    for (let i = 0; i < n; i++) {
                        const item: { [key: string]: any } = {};
                        for (const key of keys) {
                            item[key] = js[key][i];
                        }
                        rows.push(item);
                    }
                }
            }
        } else {
            throw new Error('NotImplementedError');
        }
        return rows;
    }
    /** Reference implementation of `getAnnotationForLocation`, just for checking, DO NOT USE DIRECTLY */
    getAnnotationForLocation_Reference(loc: StructureElement.Location): AnnotationRow | undefined {
        const model = loc.unit.model;
        const iAtom = loc.element;
        let result: AnnotationRow | undefined = undefined;
        for (const row of this.getRows()) {
            if (atomQualifies(model, iAtom, row)) result = row;
        }
        return result;
    }
    /** Return AnnotationRow assigned to location `loc`, if any */
    getAnnotationForLocation(loc: StructureElement.Location): AnnotationRow | undefined {
        const indexedModel = this.indexedModels.safeGet(loc.unit.model);
        return indexedModel[loc.element];
    }

    private rowForAllElements(model: Model): (AnnotationRow | undefined)[] {
        console.time('createIndicesAndSortings');
        const indicesAndSortings = createIndicesAndSortings(model);
        console.timeEnd('createIndicesAndSortings');
        console.time('fill');
        const nAtoms = model.atomicHierarchy.atoms._rowCount;
        const result: (AnnotationRow | undefined)[] = Array(nAtoms).fill(undefined);
        for (const row of this.getRows()) {
            const elements = elementsForRow(model, row, indicesAndSortings);
            for (const range of elements) {
                result.fill(row, range.from, range.to);
            }
        }
        console.timeEnd('fill');
        return result;
    }
}


function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}
function isAnyDefined(...values: any[]): boolean {
    return values.some(v => isDefined(v));
}


function elementsForRow(model: Model, row: AnnotationRow, indices: IndicesAndSortings): ElementRanges {
    const h = model.atomicHierarchy;
    const nChains = h.chains._rowCount;
    const nResidues = h.residues._rowCount;
    const nAtoms = h.atoms._rowCount;

    const hasAtomIds = isAnyDefined(row.atom_id, row.atom_index);
    const hasAtomFilter = isAnyDefined(row.label_atom_id, row.auth_atom_id);
    const hasResidueFilter = isAnyDefined(row.label_seq_id, row.auth_seq_id, row.pdbx_PDB_ins_code, row.beg_label_seq_id, row.end_label_seq_id, row.beg_auth_seq_id, row.end_auth_seq_id);
    const hasChainFilter = isAnyDefined(row.label_asym_id, row.auth_asym_id, row.label_entity_id);

    if (hasAtomIds) {
        const theAtom = elementForRow_WithAtomsIds(model, row, indices);
        return theAtom !== undefined ? [{ from: theAtom, to: theAtom + 1 as ElementIndex }] : [];
    }

    if (!hasChainFilter && !hasResidueFilter && !hasAtomFilter) {
        return [{ from: 0 as ElementIndex, to: nAtoms as ElementIndex }];
    }

    let chainIdcs: ChainIndex[] | undefined = undefined;
    if (isDefined(row.label_asym_id)) {
        chainIdcs = indices.chainsByLabelAsymId.get(row.label_asym_id) ?? [];
    }
    if (isDefined(row.auth_asym_id)) {
        if (chainIdcs) {
            filterInPlace(chainIdcs, i => h.chains.auth_asym_id.value(i) === row.auth_asym_id);
        } else {
            chainIdcs = indices.chainsByAuthAsymId.get(row.auth_asym_id) ?? [];
        }
    }
    if (isDefined(row.label_entity_id)) {
        if (chainIdcs) {
            filterInPlace(chainIdcs, i => h.chains.label_entity_id.value(i) === row.label_entity_id);
        } else {
            chainIdcs = indices.chainsByLabelEntityId.get(row.label_entity_id) ?? [];
        }
    }
    chainIdcs ??= range(nChains) as ChainIndex[];
    if (!hasResidueFilter && !hasAtomFilter) {
        const ranges: ElementRanges = [];
        for (const iChain of chainIdcs) {
            addRange(ranges, h.chainAtomSegments.offsets[iChain], h.chainAtomSegments.offsets[iChain + 1]);
        }
        return ranges;
    }

    const allResidueIdcs: ResidueIndex[] = [];
    for (const iChain of chainIdcs) {
        let residueIdcs: ResidueIndex[] | undefined = undefined;
        if (isDefined(row.label_seq_id)) {
            const sortedIndices = indices.residuesByChainIndexSortedByLabelSeqId.get(iChain)!;
            const sortedValues = indices.residuesByChainIndexSortedByLabelSeqIdValues.get(iChain)!;
            residueIdcs = getResiduesWithValue(sortedIndices, sortedValues, row.label_seq_id);
        }
        if (isDefined(row.auth_seq_id)) {
            if (residueIdcs) {
                filterInPlace(residueIdcs, i => h.residues.auth_seq_id.value(i) === row.auth_seq_id);
            } else {
                const sortedIndices = indices.residuesByChainIndexSortedByAuthSeqId.get(iChain)!;
                const sortedValues = indices.residuesByChainIndexSortedByAuthSeqIdValues.get(iChain)!;
                residueIdcs = getResiduesWithValue(sortedIndices, sortedValues, row.auth_seq_id);
            }
        }
        if (isDefined(row.pdbx_PDB_ins_code)) {
            if (residueIdcs) {
                filterInPlace(residueIdcs, i => h.residues.pdbx_PDB_ins_code.value(i) === row.pdbx_PDB_ins_code);
            } else {
                residueIdcs = indices.residuesByChainIndexByInsCode.get(iChain)!.get(row.pdbx_PDB_ins_code) ?? [];
            }
        }
        if (isDefined(row.beg_label_seq_id) || isDefined(row.end_label_seq_id)) {
            if (residueIdcs) {
                if (isDefined(row.beg_label_seq_id)) {
                    filterInPlace(residueIdcs, i => h.residues.label_seq_id.value(i) >= row.beg_label_seq_id!);
                }
                if (isDefined(row.end_label_seq_id)) {
                    filterInPlace(residueIdcs, i => h.residues.label_seq_id.value(i) <= row.end_label_seq_id!);
                }
            } else {
                const sortedIndices = indices.residuesByChainIndexSortedByLabelSeqId.get(iChain)!;
                const sortedValues = indices.residuesByChainIndexSortedByLabelSeqIdValues.get(iChain)!;
                residueIdcs = getResiduesWithValueInRange(sortedIndices, sortedValues, row.beg_label_seq_id, row.end_label_seq_id);
            }
        }
        if (isDefined(row.beg_auth_seq_id) || isDefined(row.end_auth_seq_id)) {
            if (residueIdcs) {
                if (isDefined(row.beg_auth_seq_id)) {
                    filterInPlace(residueIdcs, i => h.residues.auth_seq_id.value(i) >= row.beg_auth_seq_id!);
                }
                if (isDefined(row.end_auth_seq_id)) {
                    filterInPlace(residueIdcs, i => h.residues.auth_seq_id.value(i) <= row.end_auth_seq_id!);
                }
            } else {
                const sortedIndices = indices.residuesByChainIndexSortedByAuthSeqId.get(iChain)!;
                const sortedValues = indices.residuesByChainIndexSortedByAuthSeqIdValues.get(iChain)!;
                residueIdcs = getResiduesWithValueInRange(sortedIndices, sortedValues, row.beg_auth_seq_id, row.end_auth_seq_id);
            }
        }
        if (!residueIdcs) {
            const firstResidueForChain = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain]];
            const firstResidueAfterChain = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain + 1]] ?? nResidues;
            residueIdcs ??= range(firstResidueForChain, firstResidueAfterChain) as ResidueIndex[];
        }
        extend(allResidueIdcs, residueIdcs);
    }
    if (!hasAtomFilter) {
        const ranges: ElementRanges = [];
        for (const iRes of allResidueIdcs) {
            addRange(ranges, h.residueAtomSegments.offsets[iRes], h.residueAtomSegments.offsets[iRes + 1]);
        }
        return ranges;
    }

    const allAtomIdcs: ElementIndex[] = [];
    for (const iRes of allResidueIdcs) {
        const atomIdcs: ElementIndex[] = range(h.residueAtomSegments.offsets[iRes], h.residueAtomSegments.offsets[iRes + 1]) as ElementIndex[];
        if (isDefined(row.label_atom_id)) {
            filterInPlace(atomIdcs, iAtom => h.atoms.label_atom_id.value(iAtom) === row.label_atom_id);
        }
        if (isDefined(row.auth_atom_id)) {
            filterInPlace(atomIdcs, iAtom => h.atoms.auth_atom_id.value(iAtom) === row.auth_atom_id);
        }
        extend(allAtomIdcs, atomIdcs);
    }

    const ranges: ElementRanges = [];
    for (const iAtom of allAtomIdcs) {
        addRange(ranges, iAtom, iAtom + 1 as ElementIndex);
    }
    return ranges;
}


/** Return index of atom in `model` which qualifies selection criteria given by `row`, if any.
 * Only works when `row.atom_id` and/or `row.atom_index` is defined (otherwise use elementsForRow). */
function elementForRow_WithAtomsIds(model: Model, row: AnnotationRow, indices: IndicesAndSortings): ElementIndex | undefined {
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

/** Return true if `iAtom`-th atom in `model` qualifies all selection criteria given by `row`. */
function atomQualifies(model: Model, iAtom: ElementIndex, row: AnnotationRow): boolean {
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
    const atom_id = model.atomicConformation.atomId.value(iAtom);
    const atom_index = h.atomSourceIndex.value(iAtom);
    if (!matches(row.label_atom_id, label_atom_id)) return false;
    if (!matches(row.auth_atom_id, auth_atom_id)) return false;
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