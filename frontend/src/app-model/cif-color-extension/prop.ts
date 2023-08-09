/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Column } from 'molstar/lib/mol-data/db';
import { SortedArray } from 'molstar/lib/mol-data/int/sorted-array';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { ChainIndex, ElementIndex, Model, ResidueIndex } from 'molstar/lib/mol-model/structure';
import { StructureElement } from 'molstar/lib/mol-model/structure/structure';
import { Asset } from 'molstar/lib/mol-util/assets';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';

import { extend, range, sortIfNeeded } from '../utils';

export const AnnotationFormat = new Choice({ json: 'json', cif: 'cif', bcif: 'bcif' }, 'json');
export type AnnotationFormat = Choice.Values<typeof AnnotationFormat>
export const AnnotationFormatTypes = { json: 'string', cif: 'string', bcif: 'binary' } satisfies { [format in AnnotationFormat]: 'string' | 'binary' };

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
        return annots;
    }
});

type Data = { kind: 'string', data: string } | { kind: 'binary', data: Uint8Array }

type Annotations = { [url: string]: Annotation }

class Annotation {
    /** Store ElementIndex->AnnotationRow mapping for each Model */
    private indexedModels = new DefaultMap<Model, (AnnotationRow | undefined)[]>(model => this.rowForAllElements(model));

    constructor(
        public url: string,
        public format: AnnotationFormat,
        public data: Data,
    ) {
        // TODO check if data kind matches format (or enforce)
    }

    static async fromSource(ctx: CustomProperty.Context, source: AnnotationsSource): Promise<CustomProperty.Data<Annotation>> {
        const url = Asset.getUrlAsset(ctx.assetManager, source.url);
        const kind = AnnotationFormatTypes[source.format];
        const dataWrapper = await ctx.assetManager.resolve(url, kind).runInContext(ctx.runtime);
        const data = dataWrapper.data;
        if (!data) throw new Error('missing data');
        return { value: new Annotation(source.url, source.format, { kind, data } as Data) };
    }
    static async fromSources(ctx: CustomProperty.Context, sources: AnnotationsSource[]): Promise<CustomProperty.Data<Annotations>> {
        const result: Annotations = {};
        for (const source of sources) {
            const annot = await this.fromSource(ctx, source);
            result[source.url] = annot.value;
        }
        console.log('fromSources:', result);
        return { value: result };
    }
    getRows(): AnnotationRow[] {
        const rows: AnnotationRow[] = [];
        if (this.format === 'json') {
            if (this.data.kind !== 'string') throw new Error('Data for "json" format must be of kind "string"');
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
    /** Reference implementation of `colorForLocation`, just for checking, DO NOT USE DIRECTLY */
    colorForLocation_Reference(loc: StructureElement.Location): Color | undefined {
        const h = loc.unit.model.atomicHierarchy;
        const iAtom = loc.element;
        const iRes = h.residueAtomSegments.index[iAtom];
        const iChain = h.chainAtomSegments.index[iAtom];
        const label_entity_id = h.chains.label_entity_id.value(iChain);
        const label_asym_id = h.chains.label_asym_id.value(iChain);
        const label_seq_id = (h.residues.label_seq_id.valueKind(iRes) === Column.ValueKind.Present) ? h.residues.label_seq_id.value(iRes) : undefined;
        const auth_asym_id = h.chains.auth_asym_id.value(iChain);
        const auth_seq_id = (h.residues.auth_seq_id.valueKind(iRes) === Column.ValueKind.Present) ? h.residues.auth_seq_id.value(iRes) : undefined;
        const pdbx_PDB_ins_code = h.residues.pdbx_PDB_ins_code.value(iRes);
        const atom_id = loc.unit.model.atomicConformation.atomId.value(iAtom);
        let color: Color | undefined = undefined;
        for (const row of this.getRows()) {
            if (!isDefined(row.color)) continue;
            if (isDefined(row.label_entity_id) && label_entity_id !== row.label_entity_id) continue;
            if (isDefined(row.label_asym_id) && label_asym_id !== row.label_asym_id) continue;
            if (isDefined(row.auth_asym_id) && auth_asym_id !== row.auth_asym_id) continue;
            if (isDefined(row.label_seq_id) && label_seq_id !== row.label_seq_id) continue;
            if (isDefined(row.auth_seq_id) && auth_seq_id !== row.auth_seq_id) continue;
            if (isDefined(row.pdbx_PDB_ins_code) && pdbx_PDB_ins_code !== row.pdbx_PDB_ins_code) continue;
            if (isDefined(row.beg_label_seq_id) && (!isDefined(label_seq_id) || label_seq_id < row.beg_label_seq_id)) continue;
            if (isDefined(row.end_label_seq_id) && (!isDefined(label_seq_id) || label_seq_id > row.end_label_seq_id)) continue; // TODO check if this should be inclusive
            if (isDefined(row.beg_auth_seq_id) && (!isDefined(auth_seq_id) || auth_seq_id < row.beg_auth_seq_id)) continue;
            if (isDefined(row.end_auth_seq_id) && (!isDefined(auth_seq_id) || auth_seq_id > row.end_auth_seq_id)) continue; // TODO check if this should be inclusive
            if (isDefined(row.atom_id) && atom_id !== row.atom_id) continue;
            color = decodeColor(row.color);
        }
        return color;
    }
    /** Return color assigned to location `loc`, if any */
    colorForLocation(loc: StructureElement.Location): Color | undefined {
        const indexedModel = this.indexedModels.safeGet(loc.unit.model);
        return decodeColor(indexedModel[loc.element]?.color);
    }
    /** Return tooltip assigned to location `loc`, if any */
    tooltipForLocation(loc: StructureElement.Location): string | undefined {
        const indexedModel = this.indexedModels.safeGet(loc.unit.model);
        return indexedModel[loc.element]?.tooltip;
    }

    private rowForAllElements(model: Model): (AnnotationRow | undefined)[] {
        console.time('createIndicesAndSortings');
        const indicesAndSortings = createIndicesAndSortings(model);
        console.timeEnd('createIndicesAndSortings');
        console.time('fill');
        const nAtoms = model.atomicHierarchy.atoms._rowCount;
        const result: (AnnotationRow | undefined)[] = Array(nAtoms).fill(undefined);
        for (const row of this.getRows()) {
            const elements = this.elementsForRow(model, row, indicesAndSortings);
            for (const range of elements) {
                result.fill(row, range.from, range.to);
            }
        }
        console.timeEnd('fill');
        return result;
    }
    private elementsForRow(model: Model, row: AnnotationRow, indices: ReturnType<typeof createIndicesAndSortings>): ElementRanges {
        const h = model.atomicHierarchy;
        const nChains = h.chains._rowCount;
        const nResidues = h.residues._rowCount;
        const nAtoms = h.atoms._rowCount;

        let chainIdcs: ChainIndex[] | undefined = undefined;
        if (isDefined(row.label_asym_id)) {
            chainIdcs = indices.chainsByLabelAsymId.get(row.label_asym_id) ?? [];
        }
        if (isDefined(row.auth_asym_id)) {
            if (chainIdcs) {
                chainIdcs = chainIdcs.filter(i => h.chains.auth_asym_id.value(i) === row.auth_asym_id);
            } else {
                chainIdcs = indices.chainsByAuthAsymId.get(row.auth_asym_id) ?? [];
            }
        }
        if (isDefined(row.label_entity_id)) {
            if (chainIdcs) {
                chainIdcs = chainIdcs.filter(i => h.chains.label_entity_id.value(i) === row.label_entity_id);
            } else {
                chainIdcs = indices.chainsByLabelEntityId.get(row.label_entity_id) ?? [];
            }
        }
        chainIdcs ??= range(nChains) as ChainIndex[];

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
                    residueIdcs = residueIdcs.filter(i => h.residues.auth_seq_id.value(i) === row.auth_seq_id);
                } else {
                    const sortedIndices = indices.residuesByChainIndexSortedByAuthSeqId.get(iChain)!;
                    const sortedValues = indices.residuesByChainIndexSortedByAuthSeqIdValues.get(iChain)!;
                    residueIdcs = getResiduesWithValue(sortedIndices, sortedValues, row.auth_seq_id);
                }
            }
            if (isDefined(row.pdbx_PDB_ins_code)) {
                if (residueIdcs) {
                    residueIdcs = residueIdcs.filter(i => h.residues.pdbx_PDB_ins_code.value(i) === row.pdbx_PDB_ins_code);
                } else {
                    residueIdcs = indices.residuesByChainIndexByInsCode.get(iChain)!.get(row.pdbx_PDB_ins_code) ?? [];
                }
            }
            if (isDefined(row.beg_label_seq_id) || isDefined(row.end_label_seq_id)) {
                if (residueIdcs) {
                    if (isDefined(row.beg_label_seq_id)) {
                        residueIdcs = residueIdcs.filter(i => h.residues.label_seq_id.value(i) >= row.beg_label_seq_id!);
                    }
                    if (isDefined(row.end_label_seq_id)) {
                        residueIdcs = residueIdcs.filter(i => h.residues.label_seq_id.value(i) <= row.end_label_seq_id!);
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
                        residueIdcs = residueIdcs.filter(i => h.residues.auth_seq_id.value(i) >= row.beg_auth_seq_id!);
                    }
                    if (isDefined(row.end_auth_seq_id)) {
                        residueIdcs = residueIdcs.filter(i => h.residues.auth_seq_id.value(i) <= row.end_auth_seq_id!);
                    }
                } else {
                    const sortedIndices = indices.residuesByChainIndexSortedByAuthSeqId.get(iChain)!;
                    const sortedValues = indices.residuesByChainIndexSortedByAuthSeqIdValues.get(iChain)!;
                    residueIdcs = getResiduesWithValueInRange(sortedIndices, sortedValues, row.beg_auth_seq_id, row.end_auth_seq_id);
                }
            }
            // TODO use filterInPlace
            // TODO test thoroughly
            if (!residueIdcs) {
                const firstResidueForChain = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain]];
                const firstResidueAfterChain = h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain + 1]] ?? nResidues;
                residueIdcs ??= range(firstResidueForChain, firstResidueAfterChain) as ResidueIndex[];
            }
            extend(allResidueIdcs, residueIdcs);
        }
        // const ranges: ElementRanges = [];
        // for (const iRes of allResidueIdcs) {
        //     addRange(ranges, h.residueAtomSegments.offsets[iRes], h.residueAtomSegments.offsets[iRes + 1]);
        // }
        // return ranges;

        const allAtomIdcs: ElementIndex[] = [];
        for (const iRes of allResidueIdcs) {
            let atomIdcs: ElementIndex[] = range(h.residueAtomSegments.offsets[iRes], h.residueAtomSegments.offsets[iRes + 1]) as ElementIndex[];
            if (isDefined(row.atom_id)) {
                atomIdcs = atomIdcs.filter(iAtom => model.atomicConformation.atomId.value(iAtom) === row.atom_id);
            }
            extend(allAtomIdcs, atomIdcs);
        }
        // TODO apply this strategy only to label_atom_id/auth_atom_id!
        // TODO for atom_id use index and then check chain/residue props!

        const ranges: ElementRanges = [];
        for (const iAtom of allAtomIdcs) {
            addRange(ranges, iAtom, iAtom + 1 as ElementIndex);
        }
        return ranges;
    }
}

type ElementRanges = { from: ElementIndex, to: ElementIndex }[]
function addRange(ranges: ElementRanges, from: ElementIndex, to: ElementIndex) {
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

function createIndicesAndSortings(model: Model) {
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

function getResiduesWithValue(residues: ResidueIndex[], values: SortedArray<number>, target: number) {
    return getResiduesWithValueInRange(residues, values, target, target);
}
function getResiduesWithValueInRange(residues: ResidueIndex[], values: SortedArray<number>, min: number | undefined, max: number | undefined) {
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

class DefaultMap<K, V> extends Map<K, V> {
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
class MultiMap<K, V> extends Map<K, V[]> {
    add(key: K, value: V) {
        if (!this.has(key)) {
            this.set(key, []);
        }
        this.get(key)!.push(value);
    }
}

export function decodeColor(colorString: string | undefined): Color | undefined {
    if (colorString === undefined) return undefined;
    let result = Color.fromHexStyle(colorString);
    if (result !== undefined && !isNaN(result)) return result;
    result = ColorNames[colorString.toLowerCase() as keyof typeof ColorNames];
    if (result !== undefined) return result;
    return undefined;
}

function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}

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
    atom_id?: number,
    color?: string,
    tooltip?: string,
}
