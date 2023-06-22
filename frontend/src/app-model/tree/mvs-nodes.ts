import * as t from 'io-ts';

import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { ColorT, ComponentSelectorT, ParseFormatT, RepresentationTypeT, StructureKindT } from './param-types';
import { OptionalField, RequiredField, nullable } from './params-schema';


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
        'label': {
            label_asym_id: OptionalField(nullable(t.string)),
            label_entity_id: OptionalField(nullable(t.string)),
            label_seq_id: OptionalField(nullable(t.Integer)),
            auth_asym_id: OptionalField(nullable(t.string)),
            auth_seq_id: OptionalField(nullable(t.Integer)),
            pdbx_PDB_ins_code: OptionalField(nullable(t.string)),
            beg_label_seq_id: OptionalField(nullable(t.Integer)),
            end_label_seq_id: OptionalField(nullable(t.Integer)),
            beg_auth_seq_id: OptionalField(nullable(t.Integer)),
            end_auth_seq_id: OptionalField(nullable(t.Integer)),
            text: RequiredField(t.string),
        },
        'label-from-cif': {
            category_name: RequiredField(t.string),
        },
        'color': {
            label_asym_id: OptionalField(nullable(t.string)),
            label_entity_id: OptionalField(nullable(t.string)),
            label_seq_id: OptionalField(nullable(t.Integer)),
            auth_asym_id: OptionalField(nullable(t.string)),
            auth_seq_id: OptionalField(nullable(t.Integer)),
            pdbx_PDB_ins_code: OptionalField(nullable(t.string)),
            beg_label_seq_id: OptionalField(nullable(t.Integer)),
            end_label_seq_id: OptionalField(nullable(t.Integer)),
            beg_auth_seq_id: OptionalField(nullable(t.Integer)),
            end_auth_seq_id: OptionalField(nullable(t.Integer)),
            tooltip: OptionalField(nullable(t.string)),
            color: RequiredField(ColorT),
        },
        'color-from-cif': {
            category_name: RequiredField(t.string),
        },
    }
);


export type MVSKind = keyof typeof MVSTreeSchema.paramsSchemas

export type MVSNode<TKind extends MVSKind = MVSKind> = NodeForTree<typeof MVSTreeSchema, TKind>

export type MVSTree = TreeFor<typeof MVSTreeSchema>
