/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { Column } from 'molstar/lib/mol-data/db';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { ChainIndex, ElementIndex, Model, ResidueIndex } from 'molstar/lib/mol-model/structure';
import { StructureElement } from 'molstar/lib/mol-model/structure/structure';
import { Asset } from 'molstar/lib/mol-util/assets';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { extend, range } from '../utils';
import { AnnotationFormat, AnnotationFormatTypes } from './color';


export const AnnotationsParams = {
    annotationSources: PD.ObjectList(
        {
            url: PD.Text(''),
            format: AnnotationFormat.PDSelect(),
            // isBinary: PD.Boolean(false, { description: 'Specify if the data are binary or string' }),
        },
        obj => obj.url
    ),
};
export type AnnotationsParams = typeof AnnotationsParams
export type AnnotationsProps = PD.Values<AnnotationsParams>
export type AnnotationsSource = { url: string, isBinary: boolean }

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
        const sources = props.annotationSources ?? [];// as { url: string, isBinary: boolean }[] ?? [];
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

    static async fromSource(ctx: CustomProperty.Context, source: { url: string, format: AnnotationFormat }): Promise<CustomProperty.Data<Annotation>> {
        const url = Asset.getUrlAsset(ctx.assetManager, source.url);
        const kind = AnnotationFormatTypes[source.format];
        const dataWrapper = await ctx.assetManager.resolve(url, kind).runInContext(ctx.runtime);
        const data = dataWrapper.data;
        if (!data) throw new Error('missing data');
        return { value: new Annotation(source.url, source.format, { kind, data } as Data) };
    }
    static async fromSources(ctx: CustomProperty.Context, sources: { url: string, format: AnnotationFormat }[]): Promise<CustomProperty.Data<Annotations>> {
        const result: Annotations = {};
        for (const source of sources) {
            const annot = await this.fromSource(ctx, source);
            result[source.url] = annot.value;
        }
        console.log('fromSources:', result);
        return { value: result };
    }
    * genRows(): Generator<AnnotationRow, void, unknown> {
        // TODO return array instead of generator?
        if (this.format === 'json') {
            if (this.data.kind !== 'string') throw new Error('Data for "json" format must be of kind "string"');
            const js = JSON.parse(this.data.data);
            if (Array.isArray(js)) {
                // array of objects
                for (const item of js) {
                    yield item;
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
                        yield item;
                    }
                }
            }
        } else {
            throw new Error('NotImplementedError');
        }
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
        const label_atom_id = h.atoms.label_atom_id.value(iAtom);
        const auth_asym_id = h.chains.auth_asym_id.value(iChain);
        const auth_seq_id = (h.residues.auth_seq_id.valueKind(iRes) === Column.ValueKind.Present) ? h.residues.auth_seq_id.value(iRes) : undefined;
        const pdbx_PDB_ins_code = h.residues.pdbx_PDB_ins_code.value(iRes);
        let color: Color | undefined = undefined;
        foreachOfGenerator(this.genRows(), row => {
            if (!isDefined(row.color)) return;
            if (isDefined(row.label_entity_id) && label_entity_id !== row.label_entity_id) return;
            if (isDefined(row.label_asym_id) && label_asym_id !== row.label_asym_id) return;
            if (isDefined(row.auth_asym_id) && auth_asym_id !== row.auth_asym_id) return;
            if (isDefined(row.label_seq_id) && label_seq_id !== row.label_seq_id) return;
            if (isDefined(row.auth_seq_id) && auth_seq_id !== row.auth_seq_id) return;
            if (isDefined(row.pdbx_PDB_ins_code) && pdbx_PDB_ins_code !== row.pdbx_PDB_ins_code) return;
            if (isDefined(row.beg_label_seq_id) && (!isDefined(label_seq_id) || label_seq_id < row.beg_label_seq_id)) return;
            if (isDefined(row.end_label_seq_id) && (!isDefined(label_seq_id) || label_seq_id > row.end_label_seq_id)) return; // TODO check if this should be inclusive
            if (isDefined(row.beg_auth_seq_id) && (!isDefined(auth_seq_id) || auth_seq_id < row.beg_auth_seq_id)) return;
            if (isDefined(row.end_auth_seq_id) && (!isDefined(auth_seq_id) || auth_seq_id > row.end_auth_seq_id)) return; // TODO check if this should be inclusive
            // TODO implement atom_id (what does it mean anyway???)
            color = decodeColor(row.color);
        });
        return color;
    }
    /** Return color assigned to location `loc`, if any */
    colorForLocation(loc: StructureElement.Location): Color | undefined {
        const indexedModel = this.indexedModels.safeGet(loc.unit.model); // TODO base everything on loc.unit.model, not loc.structure.model
        return decodeColor(indexedModel[loc.element]?.color);
    }

    public rowForAllElements(model: Model): (AnnotationRow | undefined)[] { // TODO private?
        console.time('createIndices');
        const indices = createIndices(model);
        console.timeEnd('createIndices');
        console.log('indices:', indices);
        const nAtoms = model.atomicHierarchy.atoms._rowCount;
        const result: (AnnotationRow | undefined)[] = Array(nAtoms).fill(undefined);
        foreachOfGenerator(this.genRows(), row => {
            const elements = this.elementsForRow(model, row, indices);
            // const elements = this.elementsForRow_WithoutIndices(model, row);
            for (const range of elements) {
                result.fill(row, range.from, range.to);
            }
        });
        return result;
    }
    private elementsForRow(model: Model, row: AnnotationRow, indices: ReturnType<typeof createIndices>): ElementRanges {
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
        // const ranges: ElementRanges = [];
        // for (const iChain of chainIdcs) {
        //     addRange(ranges, h.chainAtomSegments.offsets[iChain], h.chainAtomSegments.offsets[iChain + 1]);
        // }
        // return ranges;

        const allResidueIdcs: ResidueIndex[] = [];
        for (const iChain of chainIdcs) {
            let residueIdcs: ResidueIndex[] | undefined = undefined;
            if (isDefined(row.label_seq_id)) {
                residueIdcs = indices.residuesByChainIndexByLabelSeqId.get(iChain)!.get(row.label_seq_id) ?? [];
            }
            if (isDefined(row.auth_seq_id)) {
                if (residueIdcs) {
                    residueIdcs = residueIdcs.filter(i => h.residues.auth_seq_id.value(i) === row.auth_seq_id);
                } else {
                    residueIdcs = indices.residuesByChainIndexByAuthSeqId.get(iChain)!.get(row.auth_seq_id) ?? [];
                }
            }
            if (isDefined(row.pdbx_PDB_ins_code)) {
                if (residueIdcs) {
                    residueIdcs = residueIdcs.filter(i => h.residues.pdbx_PDB_ins_code.value(i) === row.pdbx_PDB_ins_code);
                } else {
                    residueIdcs = indices.residuesByChainIndexByInsCode.get(iChain)!.get(row.pdbx_PDB_ins_code) ?? [];
                }
            }
            if (isDefined(row.pdbx_PDB_ins_code)) {
                if (residueIdcs) {
                    residueIdcs = residueIdcs.filter(i => h.residues.pdbx_PDB_ins_code.value(i) === row.pdbx_PDB_ins_code);
                } else {
                    residueIdcs = indices.residuesByChainIndexByInsCode.get(iChain)!.get(row.pdbx_PDB_ins_code) ?? [];
                }
            }
            if (isDefined(row.beg_label_seq_id) || isDefined(row.end_label_seq_id) || isDefined(row.beg_auth_seq_id) || isDefined(row.end_auth_seq_id) || isDefined(row.atom_id)) {
                throw new Error('NotImplementedError: elementsForRow with residue ranges or atom_id');
            }
            // TODO implement residue ranges
            residueIdcs ??= range(h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain]], h.residueAtomSegments.index[h.chainAtomSegments.offsets[iChain + 1]]) as ResidueIndex[];
            extend(allResidueIdcs, residueIdcs);
        }

        const ranges: ElementRanges = [];
        for (const iRes of allResidueIdcs) {
            addRange(ranges, h.residueAtomSegments.offsets[iRes], h.residueAtomSegments.offsets[iRes + 1]);
        }
        // TODO per-atom filter (first find out how to apply coloring per-atom)
        return ranges;
    }
    private elementsForRow_WithoutIndices(model: Model, row: AnnotationRow): ElementRanges {
        const h = model.atomicHierarchy;
        const nAtoms = h.atoms._rowCount;
        let ranges: ElementRanges = [{ from: 0 as ElementIndex, to: nAtoms as ElementIndex }];

        if (isDefined(row.label_entity_id) || isDefined(row.label_asym_id) || isDefined(row.auth_asym_id)) {
            const filteredRanges: ElementRanges = [];
            for (const { from, to } of ranges) {
                for (let iChain = h.chainAtomSegments.index[from]; h.chainAtomSegments.offsets[iChain] < to; iChain++) {
                    if (isDefined(row.label_entity_id) && h.chains.label_entity_id.value(iChain) !== row.label_entity_id) continue;
                    if (isDefined(row.label_asym_id) && h.chains.label_asym_id.value(iChain) !== row.label_asym_id) continue;
                    if (isDefined(row.auth_asym_id) && h.chains.auth_asym_id.value(iChain) !== row.auth_asym_id) continue;
                    const newRangeFrom = Math.max(h.chainAtomSegments.offsets[iChain], from) as ElementIndex;
                    const newRangeTo = Math.min(h.chainAtomSegments.offsets[iChain + 1], to) as ElementIndex;
                    addRange(filteredRanges, newRangeFrom, newRangeTo);
                }
            }
            ranges = filteredRanges;
        }

        if (isDefined(row.label_seq_id) || isDefined(row.auth_seq_id) || isDefined(row.pdbx_PDB_ins_code)
            || isDefined(row.beg_label_seq_id) || isDefined(row.end_label_seq_id) || isDefined(row.beg_auth_seq_id) || isDefined(row.end_auth_seq_id)) {
            const filteredRanges: ElementRanges = [];
            for (const { from, to } of ranges) {
                // TODO think of some smarter way than going through all residues in the range
                for (let iResidue = h.residueAtomSegments.index[from]; h.residueAtomSegments.offsets[iResidue] < to; iResidue++) {
                    const label_seq_id = (h.residues.label_seq_id.valueKind(iResidue) === Column.ValueKind.Present) ? h.residues.label_seq_id.value(iResidue) : undefined;
                    const auth_seq_id = (h.residues.auth_seq_id.valueKind(iResidue) === Column.ValueKind.Present) ? h.residues.auth_seq_id.value(iResidue) : undefined;
                    if (isDefined(row.label_seq_id) && label_seq_id !== row.label_seq_id) continue;
                    if (isDefined(row.auth_seq_id) && auth_seq_id !== row.auth_seq_id) continue;
                    if (isDefined(row.pdbx_PDB_ins_code) && h.residues.pdbx_PDB_ins_code.value(iResidue) !== row.pdbx_PDB_ins_code) continue;
                    if (isDefined(row.beg_label_seq_id) && (!isDefined(label_seq_id) || label_seq_id < row.beg_label_seq_id)) continue;
                    if (isDefined(row.end_label_seq_id) && (!isDefined(label_seq_id) || label_seq_id > row.end_label_seq_id)) continue; // TODO check if this should be inclusive
                    if (isDefined(row.beg_auth_seq_id) && (!isDefined(auth_seq_id) || auth_seq_id < row.beg_auth_seq_id)) continue;
                    if (isDefined(row.end_auth_seq_id) && (!isDefined(auth_seq_id) || auth_seq_id > row.end_auth_seq_id)) continue; // TODO check if this should be inclusive
                    const newRangeFrom = Math.max(h.residueAtomSegments.offsets[iResidue], from) as ElementIndex;
                    const newRangeTo = Math.min(h.residueAtomSegments.offsets[iResidue + 1], to) as ElementIndex;
                    addRange(filteredRanges, newRangeFrom, newRangeTo);
                }
            }
            ranges = filteredRanges;
        }
        // TODO per-atom filter (first find out how to apply coloring per-atom)

        // console.log('elementsForRow:\n', row, '\n', ...ranges)
        return ranges;
        // throw new Error('NotImplementedError');
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
function isInRanges(element: ElementIndex, ranges: ElementRanges): boolean {
    return ranges.some(r => element >= r.from && element < r.to);
}

interface Indices {
    chainsByLabelEntityId: MultiMap<string, ChainIndex>,
    chainsByLabelAsymId: MultiMap<string, ChainIndex>,
    chainsByAuthAsymId: MultiMap<string, ChainIndex>,
    residuesByChainIndexByLabelSeqId: Map<ChainIndex, MultiMap<number | undefined, ResidueIndex>>,
    residuesByChainIndexByAuthSeqId: Map<ChainIndex, MultiMap<number | undefined, ResidueIndex>>,
    residuesByChainIndexByInsCode: Map<ChainIndex, MultiMap<string | undefined, ResidueIndex>>,
}
function createIndices(model: Model) {
    const h = model.atomicHierarchy;
    const nAtoms = h.atoms._rowCount;
    const chainsByLabelEntityId = new MultiMap<string, ChainIndex>();
    const chainsByLabelAsymId = new MultiMap<string, ChainIndex>();
    const chainsByAuthAsymId = new MultiMap<string, ChainIndex>();
    const nChains = h.chains._rowCount;
    for (let iChain = 0 as ChainIndex; iChain < nChains; iChain++) {
        const label_entity_id = h.chains.label_entity_id.value(iChain);
        const label_asym_id = h.chains.label_asym_id.value(iChain);
        const auth_asym_id = h.chains.auth_asym_id.value(iChain);
        chainsByLabelEntityId.add(label_entity_id, iChain);
        chainsByLabelAsymId.add(label_asym_id, iChain);
        chainsByAuthAsymId.add(auth_asym_id, iChain);
    }
    const residuesByChainIndexByLabelSeqId = new DefaultMap<ChainIndex, MultiMap<number | undefined, ResidueIndex>>(() => new MultiMap());
    const residuesByChainIndexByAuthSeqId = new DefaultMap<ChainIndex, MultiMap<number | undefined, ResidueIndex>>(() => new MultiMap());
    const residuesByChainIndexByInsCode = new DefaultMap<ChainIndex, MultiMap<string | undefined, ResidueIndex>>(() => new MultiMap());
    const nResidues = h.residues._rowCount;
    for (let iRes = 0 as ResidueIndex; iRes < nResidues; iRes++) {
        const iAtom = h.residueAtomSegments.offsets[iRes];
        const iChain = h.chainAtomSegments.index[iAtom];
        const label_seq_id = h.residues.label_seq_id.valueKind(iRes) === Column.ValueKind.Present ? h.residues.label_seq_id.value(iRes) : undefined;
        const auth_seq_id = h.residues.auth_seq_id.valueKind(iRes) === Column.ValueKind.Present ? h.residues.auth_seq_id.value(iRes) : undefined;
        const pdbx_PDB_ins_code = h.residues.pdbx_PDB_ins_code.valueKind(iRes) === Column.ValueKind.Present ? h.residues.pdbx_PDB_ins_code.value(iRes) : undefined;
        residuesByChainIndexByLabelSeqId.safeGet(iChain).add(label_seq_id, iRes);
        residuesByChainIndexByAuthSeqId.safeGet(iChain).add(auth_seq_id, iRes);
        residuesByChainIndexByInsCode.safeGet(iChain).add(pdbx_PDB_ins_code, iRes);
    }
    return {
        chainsByLabelEntityId, chainsByLabelAsymId, chainsByAuthAsymId,
        residuesByChainIndexByLabelSeqId, residuesByChainIndexByAuthSeqId, residuesByChainIndexByInsCode,
    };
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

function foreachOfGenerator<T>(items: Generator<T>, func: (item: T) => any) {
    while (true) {
        const next = items.next();
        if (next.done) return;
        func(next.value);
    }
}