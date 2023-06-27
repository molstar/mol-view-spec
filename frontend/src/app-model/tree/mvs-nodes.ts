import * as t from 'io-ts';

import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { ColorT, ComponentSelectorT, ParseFormatT, RepresentationTypeT, SchemaT, StructureKindT } from './param-types';
import { OptionalField, RequiredField, nullable } from './params-schema';


const InlineSchemaParams = {
    label_entity_id: OptionalField(nullable(t.string)),
    label_asym_id: OptionalField(nullable(t.string)),
    auth_asym_id: OptionalField(nullable(t.string)),
    label_seq_id: OptionalField(nullable(t.Integer)),
    auth_seq_id: OptionalField(nullable(t.Integer)),
    pdbx_PDB_ins_code: OptionalField(nullable(t.string)),
    beg_label_seq_id: OptionalField(nullable(t.Integer)),
    end_label_seq_id: OptionalField(nullable(t.Integer)),
    beg_auth_seq_id: OptionalField(nullable(t.Integer)),
    end_auth_seq_id: OptionalField(nullable(t.Integer)),
    atom_id: OptionalField(nullable(t.Integer)),
    text: OptionalField(nullable(t.string)), // TODO fix backend and sync
};


export const MVSTreeSchema = TreeSchema(
    'root',
    {
        'root': {},
        'download': {
            url: RequiredField(t.string),
        },
        /** Raw node is not in the mol-view-spec proposal, now it's here for testing, TODO remove */
        'raw': {
            data: OptionalField(t.string),
        },
        'parse': {
            format: RequiredField(ParseFormatT),
            is_binary: OptionalField(t.boolean),
        },
        'structure': {
            kind: RequiredField(StructureKindT),
            assembly_id: OptionalField(nullable(t.string)),
            assembly_index: OptionalField(nullable(t.Integer)),
            model_index: OptionalField(t.Integer),
            block_index: OptionalField(nullable(t.Integer)), // TODO in conversion move to "parse"
            block_header: OptionalField(nullable(t.string)), // TODO in conversion move to "parse"
            radius: OptionalField(t.number),
            ijk_min: OptionalField(t.tuple([t.Integer, t.Integer, t.Integer])),
            ijk_max: OptionalField(t.tuple([t.Integer, t.Integer, t.Integer])),
        },
        'component': {
            selector: RequiredField(ComponentSelectorT),
        },
        'representation': {
            type: RequiredField(RepresentationTypeT),
            color: OptionalField(ColorT),
        },
        'label': { // ???
            schema: RequiredField(SchemaT),
        },
        'label-from-cif': {
            schema: RequiredField(SchemaT),
            category_name: RequiredField(t.string),
        },
        'label-from-inline': {
            schema: RequiredField(SchemaT),
            ...InlineSchemaParams,
        },
        'color': {
            schema: RequiredField(SchemaT),
        },
        'color-from-cif': {
            schema: RequiredField(SchemaT),
            category_name: RequiredField(t.string),
        },
        'color-from-inline': {
            schema: RequiredField(SchemaT),
            ...InlineSchemaParams,
            color: RequiredField(ColorT),
            tooltip: OptionalField(nullable(t.string)),
        },
    }
);


export type MVSKind = keyof typeof MVSTreeSchema.paramsSchemas

export type MVSNode<TKind extends MVSKind = MVSKind> = NodeForTree<typeof MVSTreeSchema, TKind>

export type MVSTree = TreeFor<typeof MVSTreeSchema>
