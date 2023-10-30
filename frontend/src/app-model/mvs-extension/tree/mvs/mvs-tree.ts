/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { NodeForTree, TreeFor, TreeSchema } from '../generic/tree-schema';
import { ColorT, ComponentExpression, ComponentSelectorT, Matrix, ParseFormatT, RepresentationTypeT, SchemaFormatT, SchemaT, StructureKindT, Vector3 } from './param-types';
import { OptionalField, RequiredField, float, int, list, nullable, str, tuple, union } from '../generic/params-schema';


const _DataFromUriParams = {
    uri: RequiredField(str),
    format: RequiredField(SchemaFormatT),
    /** Only applies when format is 'cif' or 'bcif' */
    category_name: OptionalField(nullable(str)),
    /** Name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip...); the default value is 'color'/'label'/'tooltip' depending on the node type */
    field_name: OptionalField(str),
    /** Only applies when format is 'cif' or 'bcif' */
    block_index: OptionalField(nullable(int)),
    /** Only applies when format is 'cif' or 'bcif' */
    block_header: OptionalField(nullable(str)),
    schema: RequiredField(SchemaT),
};
const _DataFromSourceParams = {
    category_name: OptionalField(nullable(str)),
    /** Name of the column in CIF that contains the desired value (color/label/tooltip...); the default value is 'color'/'label'/'tooltip' depending on the node type */
    field_name: OptionalField(str),
    block_index: OptionalField(nullable(int)),
    block_header: OptionalField(nullable(str)),
    schema: RequiredField(SchemaT),
};


/** Schema for `MVSTree` (MolViewSpec tree) */
export const MVSTreeSchema = TreeSchema('root',
    {
        root: {},
        download: {
            url: RequiredField(str),
        },
        parse: {
            format: RequiredField(ParseFormatT),
        },
        structure: {
            kind: RequiredField(StructureKindT),
            assembly_id: OptionalField(nullable(str)),
            assembly_index: OptionalField(nullable(int)),
            model_index: OptionalField(int),
            block_index: OptionalField(nullable(int)),
            block_header: OptionalField(nullable(str)),
            radius: OptionalField(float),
            ijk_min: OptionalField(tuple([int, int, int])),
            ijk_max: OptionalField(tuple([int, int, int])),
        },
        component: {
            selector: RequiredField(union([ComponentSelectorT, ComponentExpression, list(ComponentExpression)])),
        },
        component_from_uri: {
            ..._DataFromUriParams,
            field_values: OptionalField(nullable(list(str))),
        },
        component_from_source: {
            ..._DataFromSourceParams,
            field_values: OptionalField(nullable(list(str))),
        },
        representation: {
            type: RequiredField(RepresentationTypeT),
        },
        color: {
            color: RequiredField(ColorT),
            selector: OptionalField(union([ComponentSelectorT, ComponentExpression, list(ComponentExpression)])),
        },
        color_from_uri: {
            ..._DataFromUriParams,
        },
        color_from_source: {
            ..._DataFromSourceParams,
        },
        label: {
            text: RequiredField(str),
        },
        label_from_uri: {
            ..._DataFromUriParams,
        },
        label_from_source: {
            ..._DataFromSourceParams,
        },
        tooltip: {
            text: RequiredField(str),
        },
        tooltip_from_uri: {
            ..._DataFromUriParams,
        },
        tooltip_from_source: {
            ..._DataFromSourceParams,
        },
        focus: {
            direction: OptionalField(Vector3),
            up: OptionalField(Vector3),
        },
        transform: {
            /** 3x3 matrix, column major */
            rotation: OptionalField(nullable(Matrix)),
            translation: OptionalField(nullable(Vector3)),
        },
        canvas: {
            background_color: RequiredField(ColorT),
        },
        camera: {
            target: RequiredField(Vector3),
            position: RequiredField(Vector3),
            up: OptionalField(Vector3),
        },
    }
);


/** Node kind in a `MVSTree` */
export type MVSKind = keyof typeof MVSTreeSchema.paramsSchemas

/** Node in a `MVSTree` */
export type MVSNode<TKind extends MVSKind = MVSKind> = NodeForTree<typeof MVSTreeSchema, TKind>

/** MolViewSpec tree */
export type MVSTree = TreeFor<typeof MVSTreeSchema>
