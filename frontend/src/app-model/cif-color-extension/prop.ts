/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { Column, Table } from 'molstar/lib/mol-data/db';
import { toTable } from 'molstar/lib/mol-io/reader/cif/schema';
import { mmCIF_residueId_schema } from 'molstar/lib/mol-io/reader/cif/schema/mmcif-extras';
import { CifWriter } from 'molstar/lib/mol-io/writer/cif';
import { Model, ResidueIndex, Unit, IndexedCustomProperty } from 'molstar/lib/mol-model/structure';
import { residueIdFields } from 'molstar/lib/mol-model/structure/export/categories/atom_site';
import { StructureElement, CifExportContext, Structure } from 'molstar/lib/mol-model/structure/structure';
import { CustomPropSymbol } from 'molstar/lib/mol-script/language/symbol';
import { Type } from 'molstar/lib/mol-script/language/type';
import { QuerySymbolRuntime } from 'molstar/lib/mol-script/runtime/query/compiler';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { arraySetAdd } from 'molstar/lib/mol-util/array';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { PropertyWrapper } from 'molstar/lib/mol-model-props/common/wrapper';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';
import { Asset } from 'molstar/lib/mol-util/assets';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { AnnotationFormat } from './color';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';


export const AnnotationsParams = {
    annotationSources: PD.ObjectList(
        {
            url: PD.Text(''),
            isBinary: PD.Boolean(false, { description: 'Specify if the data are binary or string' }),
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
        const sources = props.annotationSources as { url: string, isBinary: boolean }[] ?? [];
        const annots = await Annotation.fromSources(ctx, sources);
        console.log('obtain: annotation sources:', props.annotationSources);
        console.log('obtain: annotation data:', annots);
        return annots;
    }
});


type Annotations = { [url: string]: Annotation }

class Annotation {
    constructor(
        public url: string,
        public data: { kind: 'string', data: string } | { kind: 'binary', data: Uint8Array }
    ) { }

    static async fromSource(ctx: CustomProperty.Context, source: { url: string, isBinary: boolean }): Promise<CustomProperty.Data<Annotation>> {
        const url = Asset.getUrlAsset(ctx.assetManager, source.url);
        const kind = source.isBinary ? 'binary' : 'string';
        const dataWrapper = await ctx.assetManager.resolve(url, kind).runInContext(ctx.runtime);
        const data = dataWrapper.data;
        if (!data) throw new Error('missing data');
        return { value: new Annotation(source.url, { kind, data } as any) };
    }
    static async fromSources(ctx: CustomProperty.Context, sources: { url: string, isBinary: boolean }[]): Promise<CustomProperty.Data<Annotations>> {
        const result: Annotations = {};
        for (const source of sources) {
            const annot = await this.fromSource(ctx, source);
            result[source.url] = annot.value;
        }
        console.log('fromSources:', result);
        return { value: result };
    }
    * genRows(format: AnnotationFormat): Generator<AnnotationRow, void, unknown> {
        if (format === 'json') {
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
    /** Dumb function, create index instead */
    colorForLocation(loc: StructureElement.Location, format: AnnotationFormat): Color | undefined {
        const iAtom = loc.element;
        const iRes = loc.unit.model.atomicHierarchy.residueAtomSegments.index[iAtom];
        const iChain = loc.unit.model.atomicHierarchy.chainAtomSegments.index[iAtom];
        const label_entity_id = loc.unit.model.atomicHierarchy.chains.label_entity_id.value(iChain);
        const label_asym_id = loc.unit.model.atomicHierarchy.chains.label_asym_id.value(iChain);
        const label_seq_id = loc.unit.model.atomicHierarchy.residues.label_seq_id.value(iRes);
        const label_atom_id = loc.unit.model.atomicHierarchy.atoms.label_atom_id.value(iAtom);
        const auth_asym_id = loc.unit.model.atomicHierarchy.chains.auth_asym_id.value(iChain);
        const auth_seq_id = loc.unit.model.atomicHierarchy.residues.auth_seq_id.value(iRes);
        const pdbx_PDB_ins_code = loc.unit.model.atomicHierarchy.residues.pdbx_PDB_ins_code.value(iRes);
        console.log('Loc:', label_asym_id, label_seq_id, label_atom_id);
        const rows = this.genRows(format);
        let color: Color | undefined = undefined;
        while (true) {
            const row = rows.next().value;
            if (!row) break;
            if (!isDefined(row.color)) continue;
            if (isDefined(row.label_entity_id) && label_entity_id !== row.label_entity_id) continue;
            if (isDefined(row.label_asym_id) && label_asym_id !== row.label_asym_id) continue;
            if (isDefined(row.auth_asym_id) && auth_asym_id !== row.auth_asym_id) continue;
            if (isDefined(row.label_seq_id) && label_seq_id !== row.label_seq_id) continue;
            if (isDefined(row.auth_seq_id) && auth_seq_id !== row.auth_seq_id) continue;
            if (isDefined(row.pdbx_PDB_ins_code) && pdbx_PDB_ins_code !== row.pdbx_PDB_ins_code) continue;
            if (isDefined(row.beg_label_seq_id) && label_seq_id < row.beg_label_seq_id) continue;
            if (isDefined(row.end_label_seq_id) && label_seq_id > row.end_label_seq_id) continue; // TODO check if this should be inclusive
            if (isDefined(row.beg_auth_seq_id) && auth_seq_id < row.beg_auth_seq_id) continue;
            if (isDefined(row.end_auth_seq_id) && auth_seq_id > row.end_auth_seq_id) continue; // TODO check if this should be inclusive
            // TODO implement atom_id (what does it mean anyway???)
            color = decodeColor(row.color);
            console.log('Color:', row.color, '->', color);
        }
        return color;
    }
}

export function decodeColor(colorString: string): Color | undefined {
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