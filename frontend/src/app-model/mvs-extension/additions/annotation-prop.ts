/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';
import { Column, Table } from 'molstar/lib/mol-data/db';
import { CIF, CifBlock, CifCategory, CifFile } from 'molstar/lib/mol-io/reader/cif';
import { toTable } from 'molstar/lib/mol-io/reader/cif/schema';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { Model } from 'molstar/lib/mol-model/structure';
import { Structure, StructureElement } from 'molstar/lib/mol-model/structure/structure';
import { UUID } from 'molstar/lib/mol-util';
import { Asset } from 'molstar/lib/mol-util/assets';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { Json, canonicalJsonString, extend, pickObjectKeys, promiseAllObj, range } from '../utils';
import { rangesForeach } from '../helpers/atom-ranges';
import { getIndicesAndSortings } from '../helpers/indexing';
import { PD_MaybeString } from '../helpers/param-definition';
import { AnnotationRow, AnnotationSchema, CIFAnnotationSchema, FieldsForSchemas } from '../helpers/schemas';
import { atomQualifies, getAtomRangesForRow } from '../helpers/selections';


/** Allowed values for the annotation format parameter */
const AnnotationFormat = new Choice({ json: 'json', cif: 'cif', bcif: 'bcif' }, 'json');
type AnnotationFormat = Choice.Values<typeof AnnotationFormat>
const AnnotationFormatTypes = { json: 'string', cif: 'string', bcif: 'binary' } as const satisfies { [format in AnnotationFormat]: 'string' | 'binary' };

/** Parameter definition for custom model property "Annotations" */
export const AnnotationsParams = {
    annotations: PD.ObjectList(
        {
            source: PD.MappedStatic('source-cif', {
                'source-cif': PD.EmptyGroup(),
                'url': PD.Group({
                    url: PD.Text(''),
                    format: AnnotationFormat.PDSelect(),
                }),
            }),
            schema: AnnotationSchema.PDSelect(),
            cifBlock: PD.MappedStatic('index', {
                index: PD.Group({ index: PD.Numeric(0, { min: 0, step: 1 }, { description: '0-based index of the block' }) }),
                header: PD.Group({ header: PD.Text(undefined, { description: 'Block header' }) }),
            }, { description: 'Specify which CIF block contains annotation data (only relevant when format=cif or format=bcif)' }),
            cifCategory: PD_MaybeString(undefined, { description: 'Specify which CIF category contains annotation data (only relevant when format=cif or format=bcif)' }),
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

/** Describes the source of an annotation file */
type AnnotationSource = { kind: 'url', url: string, format: AnnotationFormat } | { kind: 'source-cif' }

/** Data file with one or more (in case of CIF) annotations */
type AnnotationFile = { format: 'json', data: Json } | { format: 'cif', data: CifFile }

/** Data for a single annotation */
type AnnotationData = { format: 'json', data: Json } | { format: 'cif', data: CifCategory }


/** Provider for custom model property "Annotations" */
export const AnnotationsProvider: CustomModelProperty.Provider<AnnotationsParams, Annotations> = CustomModelProperty.createProvider({
    label: 'Annotations',
    descriptor: CustomPropertyDescriptor({
        name: 'mvs-annotations',
    }),
    type: 'static',
    defaultParams: AnnotationsParams,
    getParams: (data: Model) => AnnotationsParams,
    isApplicable: (data: Model) => true,
    obtain: async (ctx: CustomProperty.Context, data: Model, props: Partial<AnnotationsProps>) => {
        props = { ...PD.getDefaultValues(AnnotationsParams), ...props };
        const specs: AnnotationSpec[] = props.annotations ?? [];
        const annots = await Annotations.fromSpecs(ctx, specs, data);
        console.log('obtain: annotation sources:', props.annotations);
        console.log('obtain: annotation data:', annots);
        return { value: annots } satisfies CustomProperty.Data<Annotations>;
    }
});

export function getAnnotationForStructure(structure: Structure, annotationId: string): { annotation: Annotation, model: Model } | { annotation: undefined, model: undefined } {
    if (structure.isEmpty) return { annotation: undefined, model: undefined };
    for (const model of structure.models) {
        if (model.customProperties.has(AnnotationsProvider.descriptor)) {
            const annots = AnnotationsProvider.get(model).value;
            const annotation = annots?.getAnnotation(annotationId);
            if (annotation) {
                return { annotation, model };
            }
        }
    }
    return { annotation: undefined, model: undefined };
}


/** Represents multiple annotations retrievable by their ID */
export class Annotations {
    private constructor(private dict: { [id: string]: Annotation }) { }
    static async fromSpecs(ctx: CustomProperty.Context, specs: AnnotationSpec[], model?: Model): Promise<Annotations> {
        const sources: AnnotationSource[] = specs.map(annotationSourceFromSpec);
        const data = await getFileFromSources(ctx, sources, model);
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
    /** Store mapping `ElementIndex` -> annotation row index for each `Model`, -1 means no row applies */
    private indexedModels = new Map<UUID, number[]>();
    private rows: AnnotationRow[] | undefined = undefined;

    constructor(
        public data: AnnotationData,
        public schema: AnnotationSchema,
    ) { }

    /** Create a new `Annotation` based on specification `spec`. Use `file` if provided, otherwise download the file. */
    static async fromSpec(ctx: CustomProperty.Context, spec: AnnotationSpec, file?: AnnotationFile): Promise<Annotation> {
        file ??= await getFileFromSource(ctx, annotationSourceFromSpec(spec));
        let data: AnnotationData;
        switch (file.format) {
            case 'json':
                data = file;
                break;
            case 'cif':
                if (file.data.blocks.length === 0) throw new Error('No block in CIF');
                const blockSpec = spec.cifBlock;
                let block: CifBlock;
                switch (blockSpec.name) {
                    case 'header':
                        const foundBlock = file.data.blocks.find(b => b.header === blockSpec.params.header);
                        if (!foundBlock) throw new Error(`CIF block with header ${blockSpec.params.header} not found`);
                        block = foundBlock;
                        break;
                    case 'index':
                        block = file.data.blocks[blockSpec.params.index];
                        if (!block) throw new Error(`CIF block with index ${blockSpec.params.index} not found`);
                        break;
                }
                const categoryName = spec.cifCategory ?? Object.keys(block.categories)[0];
                if (!categoryName) throw new Error('There are no categories in CIF block');
                const category = block.categories[categoryName];
                if (!category) throw new Error(`CIF category ${categoryName} not found`);
                data = { format: 'cif', data: category };
                break;
        }
        return new Annotation(data, spec.schema);
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

    /** Return value of field `fieldName` assigned to location `loc`, if any */
    getValueForLocation(loc: StructureElement.Location, fieldName: string): string | undefined {
        const indexedModel = this.getIndexedModel(loc.unit.model);
        const iRow = indexedModel[loc.element];
        return this.getValueForRow(iRow, fieldName);
    }
    /** Return value of field `fieldName` assigned to `i`-th annotation row, if any */
    getValueForRow(i: number, fieldName: string): string | undefined {
        if (i < 0) return undefined;
        switch (this.data.format) {
            case 'json':
                const value = getValueFromJson(i, fieldName, this.data.data);
                if (value === undefined || typeof value === 'string') return value;
                else return `${value}`;
            case 'cif':
                return getValueFromCif(i, fieldName, this.data.data);
        }
    }

    /** Return cached `ElementIndex` -> `AnnotationRow` mapping for `Model` (or create it if not cached yet) */
    private getIndexedModel(model: Model): number[] {
        const key = model.id;
        if (!this.indexedModels.has(key)) {
            const result = this.getRowForEachAtom(model);
            this.indexedModels.set(key, result);
        }
        return this.indexedModels.get(key)!;
    }

    /** Create `ElementIndex` -> `AnnotationRow` mapping for `Model` */
    private getRowForEachAtom(model: Model): number[] {
        const indices = getIndicesAndSortings(model);
        const nAtoms = model.atomicHierarchy.atoms._rowCount;
        const result: number[] = Array(nAtoms).fill(-1);
        const rows = this.getRows();
        for (let i = 0, nRows = rows.length; i < nRows; i++) {
            const atomRanges = getAtomRangesForRow(model, rows[i], indices);
            rangesForeach(atomRanges, (from, to) => result.fill(i, from, to));
        }
        return result;
    }

    /** Parse and return all annotation rows in this annotation */
    private _getRows(): AnnotationRow[] {
        switch (this.data.format) {
            case 'json':
                return getRowsFromJson(this.data.data, this.schema);
            case 'cif':
                return getRowsFromCif(this.data.data, this.schema);
        }
    }
    /** Parse and return all annotation rows in this annotation, or return cached result if available */
    getRows(): readonly AnnotationRow[] {
        return this.rows ??= this._getRows();
    }
}

function getValueFromJson<T>(rowIndex: number, fieldName: string, data: Json): T | undefined {
    const js = data as any;
    if (Array.isArray(js)) {
        const row = js[rowIndex] ?? {};
        return row[fieldName];
    } else {
        const column = js[fieldName] ?? [];
        return column[rowIndex];
    }
}
function getValueFromCif(rowIndex: number, fieldName: string, data: CifCategory): string | undefined {
    const column = data.getField(fieldName);
    if (!column) return undefined;
    if (column.valueKind(rowIndex) !== Column.ValueKind.Present) return undefined;
    return column.str(rowIndex);
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

function getRowsFromCif(data: CifCategory, schema: AnnotationSchema): AnnotationRow[] {
    const rows: AnnotationRow[] = [];
    const cifSchema = pickObjectKeys(CIFAnnotationSchema, FieldsForSchemas[schema]);
    const table = toTable(cifSchema, data);
    extend(rows, getRowsFromTable(table)); // Avoiding Table.getRows(table) as it replaces . and ? fields by 0 or ''
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


async function getFileFromSource(ctx: CustomProperty.Context, source: AnnotationSource, model?: Model): Promise<AnnotationFile> {
    switch (source.kind) {
        case 'source-cif':
            return { format: 'cif', data: getFileFromModel(model) };
        case 'url':
            const url = Asset.getUrlAsset(ctx.assetManager, source.url);
            const dataType = AnnotationFormatTypes[source.format];
            const dataWrapper = await ctx.assetManager.resolve(url, dataType).runInContext(ctx.runtime);
            const rawData = dataWrapper.data;
            if (!rawData) throw new Error('Missing data');
            switch (source.format) {
                case 'json':
                    const json = JSON.parse(rawData as string) as Json;
                    return { format: 'json', data: json };
                case 'cif':
                case 'bcif':
                    const parsed = await CIF.parse(rawData).run();
                    if (parsed.isError) throw new Error(`Failed to parse ${source.format}`);
                    return { format: 'cif', data: parsed.result };
            }
    }
}
/** Like `sources.map(s => getFileFromSource(ctx, s))`
 * but downloads a repeating source only once. */
async function getFileFromSources(ctx: CustomProperty.Context, sources: AnnotationSource[], model?: Model): Promise<AnnotationFile[]> {
    const promises: { [key: string]: Promise<AnnotationFile> } = {};
    for (const src of sources) {
        const key = canonicalJsonString(src);
        promises[key] ??= getFileFromSource(ctx, src, model);
    }
    const data = await promiseAllObj(promises);
    return sources.map(src => data[canonicalJsonString(src)]);
}

function getFileFromModel(model?: Model): CifFile {
    if (model && MmcifFormat.is(model.sourceData)) {
        if (model.sourceData.data.file) {
            return model.sourceData.data.file;
        } else {
            const frame = model.sourceData.data.frame;
            const block = CifBlock(Array.from(frame.categoryNames), frame.categories, frame.header);
            const file = CifFile([block]);
            return file;
        }
    } else {
        console.warn('Could not get CifFile from Model, returning empty CifFile');
        return CifFile([]);
    }
}

function annotationSourceFromSpec(s: AnnotationSpec): AnnotationSource {
    switch (s.source.name) {
        case 'url':
            return { kind: 'url', ...s.source.params };
        case 'source-cif':
            return { kind: 'source-cif' };
    }
}

interface GroupedArray<T> {
    /** Number of groups */
    count: number,
    /** Get size of i-th group as `offsets[i+1]-offsets[i]`.
     * Get j-th element in i-th group as `grouped[offsets[i]+j]` */
    offsets: number[],
    /** Get j-th element in i-th group as `grouped[offsets[i]+j]` */
    grouped: T[],
}
/** Return row indices grouped by `row.group_id`. Rows with `row.group_id===undefined` are treated as separate groups. */
export function groupRows(rows: readonly AnnotationRow[]): GroupedArray<number> {
    let counter = 0;
    const groupMap = new Map<string, number>();
    const groups: number[] = [];
    for (let i = 0; i < rows.length; i++) {
        const group_id = rows[i].group_id;
        if (group_id === undefined) {
            groups.push(counter++);
        } else {
            const groupIndex = groupMap.get(group_id);
            if (groupIndex === undefined) {
                groupMap.set(group_id, counter);
                groups.push(counter);
                counter++;
            } else {
                groups.push(groupIndex);
            }
        }
    }
    const rowIndices = range(rows.length).sort((i, j) => groups[i] - groups[j]);
    const offsets: number[] = [];
    for (let i = 0; i < rows.length; i++) {
        if (i === 0 || groups[rowIndices[i]] !== groups[rowIndices[i - 1]]) offsets.push(i);
    }
    offsets.push(rowIndices.length);
    return { count: offsets.length - 1, offsets, grouped: rowIndices };
}
export function testGroupRows() {
    const rows = [{ label: 'A' }, { label: 'B', group_id: 1 }, { label: 'C', group_id: 'x' }, { label: 'D', group_id: 1 }, { label: 'E' }, { label: 'F' }, { label: 'G', group_id: 'x' }, { label: 'H', group_id: 'x' }] as any as AnnotationRow[];
    const { count, offsets, grouped } = groupRows(rows);
    for (let i = 0; i < count; i++) {
        console.log('Group', i);
        for (let j = offsets[i], stop = offsets[i + 1]; j < stop; j++) {
            console.log('   ', rows[grouped[j]]);
        }
    }
}
// TODO turn into a proper jest test
