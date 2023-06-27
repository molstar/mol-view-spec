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


export const AnnotationsParams = {
    annotationSources: PD.ObjectList(
        {
            url: PD.Text(''),
            format: PD.Select('json', [['json', 'json'], ['cif', 'cif']])
        },
        obj => obj.url
    ),
};
export type AnnotationsParams = typeof AnnotationsParams
export type AnnotationsProps = PD.Values<AnnotationsParams>

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
        const sources = props.annotationSources as { url: string, format: 'json' | 'cif' }[] ?? [];
        const annots = await Annotation.fromSources(ctx, sources);
        console.log('obtain: annotation sources:', props.annotationSources);
        console.log('obtain: annotation data:', annots);
        return annots;
    }
});


type Annotations = { [url: string]: Annotation }

class Annotation {
    constructor(public url: string, public format: 'json' | 'cif', public data: string) { }

    static async fromSource(ctx: CustomProperty.Context, source: { url: string, format: 'json' | 'cif' }): Promise<CustomProperty.Data<Annotation>> {
        const url = Asset.getUrlAsset(ctx.assetManager, source.url);
        const dataWrapper = await ctx.assetManager.resolve(url, 'string').runInContext(ctx.runtime);
        const data = dataWrapper.data;
        if (!data) throw new Error('missing data');
        return { value: new Annotation(source.url, source.format, data) };
    }
    static async fromSources(ctx: CustomProperty.Context, sources: { url: string, format: 'json' | 'cif' }[]): Promise<CustomProperty.Data<Annotations>> {
        const result: Annotations = {};
        for (const source of sources) {
            const annot = await this.fromSource(ctx, source);
            result[source.url] = annot.value;
        }
        console.log('fromSources:', result);
        return { value: result };
    }



}

