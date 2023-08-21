/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';
import { Column, Table } from 'molstar/lib/mol-data/db';
import { CIF, CifFile } from 'molstar/lib/mol-io/reader/cif';
import { toTable } from 'molstar/lib/mol-io/reader/cif/schema';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { Model } from 'molstar/lib/mol-model/structure';
import { StructureElement } from 'molstar/lib/mol-model/structure/structure';
import { UUID } from 'molstar/lib/mol-util';
import { Asset } from 'molstar/lib/mol-util/assets';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { Json, extend, pickObjectKeys, promiseAllObj } from '../utils';
import { createIndicesAndSortings } from './helpers/indexing';
import { atomQualifies, getAtomRangesForRow } from './helpers/selections';
import { AnnotationRow, AnnotationSchema, CIFAnnotationSchema, FieldsForSchemas } from './schemas';
import { rangesForeach } from './helpers/atom-ranges';


/** Allowed values for the annotation format parameter */
const AnnotationFormat = new Choice({ json: 'json', cif: 'cif', bcif: 'bcif' }, 'json');
type AnnotationFormat = Choice.Values<typeof AnnotationFormat>
const AnnotationFormatTypes = { json: 'string', cif: 'string', bcif: 'binary' } as const satisfies { [format in AnnotationFormat]: 'string' | 'binary' };

/** Parameter definition for custom model property "Annotations" */
export const AnnotationsParams = {
    annotations: PD.ObjectList(
        {
            url: PD.Text(''),
            format: AnnotationFormat.PDSelect(),
            schema: AnnotationSchema.PDSelect(),
            cifCategories: PD.MappedStatic('all', {
                all: PD.EmptyGroup(),
                selected: PD.Group({
                    list: PD.ObjectList(
                        { categoryName: PD.Text() },
                        obj => obj.categoryName
                    ),
                })
            }),
            id: PD.Text('', { description: 'Arbitrary identifier that can be referenced by AnnotationColorTheme' }),
        },
        obj => obj.id
    ),
};
export type AnnotationsParams = typeof AnnotationsParams

/** Parameter values for custom model property "Annotations" */
export type AnnotationsProps = PD.Values<AnnotationsParams>

/** Parameter values for a single annotation within custom model property "Annotations" */
export type AnnotationSpec = AnnotationsProps['annotations'][number]

/** Describes the source of data for a single annotation within custom model property "Annotations" */
export type AnnotationSource = { url: string, format: AnnotationFormat }

/** Data for a single annotation */
type AnnotationData = { format: 'json', data: Json } | { format: 'cif', data: CifFile } | { format: 'bcif', data: CifFile }


/** Provider for custom model property "Annotations" */
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
        props = { ...PD.getDefaultValues(AnnotationsParams), ...props };
        const specs: AnnotationSpec[] = props.annotations ?? [];
        const annots = await Annotations.fromSpecs(ctx, specs);
        console.log('obtain: annotation sources:', props.annotations);
        console.log('obtain: annotation data:', annots);
        return { value: annots } satisfies CustomProperty.Data<Annotations>;
    }
});


/** Represents multiple annotations retrievable by their ID */
export class Annotations {
    private constructor(private dict: { [id: string]: Annotation }) { }
    static async fromSpecs(ctx: CustomProperty.Context, specs: AnnotationSpec[]): Promise<Annotations> {
        const data = await getDataFromSources(ctx, specs);
        const dict: { [id: string]: Annotation } = {};
        for (let i = 0; i < specs.length; i++) {
            const spec = specs[i];
            dict[spec.id] = await Annotation.fromSpec(ctx, spec, data[i]);
        }
        return new Annotations(dict);
    }
    getAnnotation(id: string): Annotation | undefined {
        return this.dict[id];
    }
    getAllAnnotations(): Annotation[] {
        return Object.values(this.dict);
    }
}


/** Main class for processing annotation */
export class Annotation {
    /** Store `ElementIndex` -> `AnnotationRow` mapping for each `Model` */
    private indexedModels = new Map<UUID, (AnnotationRow | undefined)[]>();

    constructor(
        public data: AnnotationData,
        public schema: AnnotationSchema,
        public cifCategories: string[] | undefined,
    ) { }

    /** Create a new `Annotation` based on specification `spec`. Use `data` if provided, otherwise download the data. */
    static async fromSpec(ctx: CustomProperty.Context, spec: AnnotationSpec, data?: AnnotationData): Promise<Annotation> {
        data ??= await getDataFromSource(ctx, spec);
        const schema = spec.schema;
        const cifCategories = spec.cifCategories.name === 'selected' ? spec.cifCategories.params.list.map(o => o.categoryName) : undefined;
        return new Annotation(data, schema, cifCategories);
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
        const indexedModel = this.getIndexedModel(loc.unit.model);
        return indexedModel[loc.element];
    }

    /** Return cached `ElementIndex` -> `AnnotationRow` mapping for `Model` (or create it if not cached yet) */
    private getIndexedModel(model: Model): (AnnotationRow | undefined)[] {
        const key = model.id;
        if (!this.indexedModels.has(key)) {
            const result = this.getRowForEachAtom(model);
            this.indexedModels.set(key, result);
        }
        return this.indexedModels.get(key)!;
    }

    /** Create `ElementIndex` -> `AnnotationRow` mapping for `Model` */
    private getRowForEachAtom(model: Model): (AnnotationRow | undefined)[] {
        const indices = createIndicesAndSortings(model);
        const nAtoms = model.atomicHierarchy.atoms._rowCount;
        const result: (AnnotationRow | undefined)[] = Array(nAtoms).fill(undefined);
        console.time('fill');
        for (const row of this.getRows()) {
            const atomRanges = getAtomRangesForRow(model, row, indices);
            rangesForeach(atomRanges, (from, to) => result.fill(row, from, to));
            // for (const range of atomRanges) {
            //     result.fill(row, range.from, range.to);
            // }
        }
        console.timeEnd('fill');
        return result;
    }

    /** Parse and return all annotation rows in this annotation */
    private getRows(): AnnotationRow[] {
        switch (this.data.format) {
            case 'json':
                return getRowsFromJson(this.data.data, this.schema);
            case 'cif':
            case 'bcif':
                return getRowsFromCif(this.data.data, this.cifCategories, this.schema);
        }
    }
}


function getRowsFromJson(data: Json, schema: AnnotationSchema): AnnotationRow[] {
    const js = data as any;
    if (Array.isArray(js)) {
        // array of objects
        const wantedKeys = FieldsForSchemas[schema];
        return js.map(row => pickObjectKeys(row, wantedKeys));
    } else {
        // object of arrays
        const rows: AnnotationRow[] = [];
        const wantedKeys = new Set<string>(FieldsForSchemas[schema]);
        const keys = Object.keys(js).filter(key => wantedKeys.has(key));
        if (keys.length > 0) {
            const n = js[keys[0]].length;
            if (keys.some(key => js[key].length !== n)) throw new Error('FormatError: arrays must have the same length.');
            for (let i = 0; i < n; i++) {
                const item: { [key: string]: any } = {};
                for (const key of keys) {
                    item[key] = js[key][i];
                }
                rows.push(item);
            }
        }
        return rows;
    }
}

function getRowsFromCif(data: CifFile, categoryNames: string[] | undefined, schema: AnnotationSchema): AnnotationRow[] {
    const rows: AnnotationRow[] = [];
    if (data.blocks.length === 0) throw new Error('No block in CIF');
    const block = data.blocks[0]; // TODO block header or index should be passed from somewhere
    categoryNames ??= Object.keys(block.categories);
    for (const categoryName of categoryNames) {
        const category = block.categories[categoryName];
        if (!category) {
            console.error(`CIF category ${categoryName} not found`);
            continue;
        }
        if (!category.getField('color')) continue;
        const cifSchema = pickObjectKeys(CIFAnnotationSchema, FieldsForSchemas[schema]);
        const table = toTable(cifSchema, category);
        extend(rows, getRowsFromTable(table)); // Avoiding Table.getRows(table) as it replaces . and ? fields by 0 or ''
    }
    return rows;
}

/** Same as `Table.getRows` but omits `.` and `?` fields (instead of using type defaults) */
function getRowsFromTable<S extends Table.Schema>(table: Table<S>): Partial<Table.Row<S>>[] {
    const rows: Partial<Table.Row<S>>[] = [];
    const columns = table._columns;
    const nRows = table._rowCount;
    const Present = Column.ValueKind.Present;
    for (let iRow = 0; iRow < nRows; iRow++) {
        const row: Partial<Table.Row<S>> = {};
        for (const col of columns) {
            if (table[col].valueKind(iRow) === Present) {
                row[col as keyof S] = table[col].value(iRow);
            }
        }
        rows[iRow] = row;
    }
    return rows;
}


async function getDataFromSource(ctx: CustomProperty.Context, source: AnnotationSource): Promise<AnnotationData> {
    const url = Asset.getUrlAsset(ctx.assetManager, source.url);
    const dataType = AnnotationFormatTypes[source.format];
    const dataWrapper = await ctx.assetManager.resolve(url, dataType).runInContext(ctx.runtime);
    const rawData = dataWrapper.data;
    if (!rawData) throw new Error('Missing data');
    switch (source.format) {
        case 'json':
            const json = JSON.parse(rawData as string) as Json;
            return { format: source.format, data: json };
        case 'cif':
        case 'bcif':
            const parsed = await CIF.parse(rawData).run();
            if (parsed.isError) throw new Error(`Failed to parse ${source.format}`);
            return { format: source.format, data: parsed.result };
    }
}
/** Like `sources.map(s => getDataFromSource(ctx, s))`
 * but downloads a repeating source only once. */
async function getDataFromSources(ctx: CustomProperty.Context, sources: AnnotationSource[]): Promise<AnnotationData[]> {
    const promises: { [key: string]: Promise<AnnotationData> } = {};
    for (const src of sources) {
        const key = `${src.format}:${src.url}`;
        promises[key] = getDataFromSource(ctx, src);
    }
    const data = await promiseAllObj(promises);
    return sources.map(src => data[`${src.format}:${src.url}`]);
}
