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

import { DefaultMap, extend, range } from '../utils';
import { ElementRanges, IndicesAndSortings, addRange, createIndicesAndSortings, getResiduesWithValue, getResiduesWithValueInRange } from './helpers';


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
    /** Reference implementation of `getAnnotationForLocation`, just for checking, DO NOT USE DIRECTLY */
    getAnnotationForLocation_Reference(loc: StructureElement.Location): AnnotationRow | undefined {
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
        let result: AnnotationRow | undefined = undefined;
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
            result = row;
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
            const elements = this.elementsForRow(model, row, indicesAndSortings);
            for (const range of elements) {
                result.fill(row, range.from, range.to);
            }
        }
        console.timeEnd('fill');
        return result;
    }
    private elementsForRow(model: Model, row: AnnotationRow, indices: IndicesAndSortings): ElementRanges {
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


function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}
