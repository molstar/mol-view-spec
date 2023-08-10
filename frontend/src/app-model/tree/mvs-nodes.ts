import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { ColorT, ComponentSelectorT, ParseFormatT, RepresentationTypeT, SchemaFormatT, SchemaT, StructureKindT } from './param-types';
import { OptionalField, RequiredField, float, int, nullable, str, tuple } from './params-schema';


const InlineSchemaParams = {
    label_entity_id: OptionalField(nullable(str)),
    label_asym_id: OptionalField(nullable(str)),
    auth_asym_id: OptionalField(nullable(str)),
    label_seq_id: OptionalField(nullable(int)),
    auth_seq_id: OptionalField(nullable(int)),
    pdbx_PDB_ins_code: OptionalField(nullable(str)),
    beg_label_seq_id: OptionalField(nullable(int)),
    end_label_seq_id: OptionalField(nullable(int)),
    beg_auth_seq_id: OptionalField(nullable(int)),
    end_auth_seq_id: OptionalField(nullable(int)),
    atom_id: OptionalField(nullable(int)),
    atom_index: OptionalField(nullable(int)),
    label_atom_id: OptionalField(nullable(str)),
    auth_atom_id: OptionalField(nullable(str)),
};
const LabelParams = {
    schema: RequiredField(SchemaT),
};
const ColorParams = {
    schema: RequiredField(SchemaT),
};


export const MVSTreeSchema = TreeSchema(
    'root',
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
            selector: RequiredField(ComponentSelectorT),
        },
        'representation': {
            type: RequiredField(RepresentationTypeT),
            color: OptionalField(ColorT),
        },
        'label-from-cif': {
            ...LabelParams,
            category_name: RequiredField(str),
        },
        'label-from-url': {
            ...LabelParams,
            url: RequiredField(str),
            format: RequiredField(SchemaFormatT),
        },
        'label-from-json': {
            ...LabelParams,
            data: RequiredField(str),
        },
        'label-from-inline': {
            ...LabelParams,
            ...InlineSchemaParams,
            text: RequiredField(str),
        },
        'color-from-cif': {
            ...ColorParams,
            category_name: RequiredField(str),
        },
        'color-from-url': {
            ...ColorParams,
            url: RequiredField(str),
            format: RequiredField(SchemaFormatT),
        },
        'color-from-json': {
            ...ColorParams,
            data: RequiredField(str),
        },
        'color-from-inline': {
            ...ColorParams,
            ...InlineSchemaParams,
            color: RequiredField(ColorT),
            tooltip: OptionalField(nullable(str)),
        },
    }
);


export type MVSKind = keyof typeof MVSTreeSchema.paramsSchemas

export type MVSNode<TKind extends MVSKind = MVSKind> = NodeForTree<typeof MVSTreeSchema, TKind>

export type MVSTree = TreeFor<typeof MVSTreeSchema>
