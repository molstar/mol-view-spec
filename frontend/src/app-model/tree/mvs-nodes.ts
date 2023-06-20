import * as t from 'io-ts';

import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { ColorT, ComponentSelectorT, ParseFormatT, RepresentationTypeT } from './param-types';
import { OptionalField, RequiredField } from './params-schema';


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
            assembly_id: OptionalField(t.string),
            model_index: OptionalField(t.Integer),
        },
        'component': {
            selector: RequiredField(ComponentSelectorT),
        },
        'representation': {
            type: RequiredField(RepresentationTypeT),
            color: OptionalField(ColorT),
        },
        'label': {
            label_asym_id: RequiredField(t.string),
            label_seq_id: OptionalField(t.Integer),
            text: RequiredField(t.string),
        },
        'label-from-cif': {
            category_name: RequiredField(t.string),
        },
        'color': {
            label_asym_id: RequiredField(t.string),
            label_seq_id: RequiredField(t.Integer),
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
