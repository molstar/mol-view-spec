import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { ColorT, ComponentExpression, ComponentSelectorT, HexColorT, Matrix, ParseFormatT, RepresentationTypeT, SchemaFormatT, SchemaT, StructureKindT, Vector3 } from './param-types';
import { OptionalField, RequiredField, float, int, list, nullable, str, tuple, union } from './params-schema';


const _DataFromUrlParams = {
    url: RequiredField(str),
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
const _DataFromCifParams = {
    category_name: OptionalField(nullable(str)),
    /** Name of the column in CIF that contains the desired value (color/label/tooltip...); the default value is 'color'/'label'/'tooltip' depending on the node type */
    field_name: OptionalField(str),
    block_index: OptionalField(nullable(int)),
    block_header: OptionalField(nullable(str)),
    schema: RequiredField(SchemaT),
};


export const MVSTreeSchema = TreeSchema('root',
    {
        'root': {},
        'download': {
            url: RequiredField(str),
        },
        /** Raw node is not in the mol-view-spec proposal, now it's here for testing, TODO remove */
        'raw': {
            data: OptionalField(str),
        },
        'parse': {
            format: RequiredField(ParseFormatT),
        },
        'structure': {
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
        'component': {
            selector: RequiredField(union([ComponentSelectorT, ComponentExpression, list(ComponentExpression)])),
        },
        'component-from-url': {
            ..._DataFromUrlParams,
            field_values: OptionalField(nullable(list(str))),
        },
        'component-from-cif': {
            ..._DataFromCifParams,
            field_values: OptionalField(nullable(list(str))),
        },
        'representation': {
            type: RequiredField(RepresentationTypeT),
        },
        'color': {
            color: RequiredField(union([ColorT, HexColorT])),
            selector: OptionalField(union([ComponentSelectorT, ComponentExpression, list(ComponentExpression)])),
        },
        'color-from-url': {
            ..._DataFromUrlParams,
        },
        'color-from-cif': {
            ..._DataFromCifParams,
        },
        'label': {
            text: RequiredField(str),
        },
        'label-from-url': {
            ..._DataFromUrlParams,
        },
        'label-from-cif': {
            ..._DataFromCifParams,
        },
        'tooltip': {
            text: RequiredField(str),
        },
        'tooltip-from-url': {
            ..._DataFromUrlParams,
        },
        'tooltip-from-cif': {
            ..._DataFromCifParams,
        },
        'focus': {
            direction: OptionalField(Vector3),
            up: OptionalField(Vector3),
        },
        'transform': {
            /** 3x3 matrix, column major */
            rotation: OptionalField(nullable(Matrix)),
            translation: OptionalField(nullable(Vector3)),
        },
        'canvas': {
            background_color: RequiredField(union([ColorT, HexColorT])),
        },
        'camera': {
            target: RequiredField(Vector3),
            position: RequiredField(Vector3),
            up: OptionalField(Vector3),
        },
    }
);


export type MVSKind = keyof typeof MVSTreeSchema.paramsSchemas

export type MVSNode<TKind extends MVSKind = MVSKind> = NodeForTree<typeof MVSTreeSchema, TKind>

export type MVSTree = TreeFor<typeof MVSTreeSchema>
