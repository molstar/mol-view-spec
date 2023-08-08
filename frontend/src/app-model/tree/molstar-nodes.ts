import * as t from 'io-ts';

import { omitObjectKeys, pickObjectKeys } from '../utils';
import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { MVSTreeSchema } from './mvs-nodes';
import { RequiredField } from './params-schema';
import { MolstarParseFormatT } from './param-types';


export const MolstarTreeSchema = TreeSchema(
    'root',
    {
        ...MVSTreeSchema.paramsSchemas,
        'download': {
            ...MVSTreeSchema.paramsSchemas.download,
            is_binary: RequiredField(t.boolean),
            // is_binary: MVSTreeSchema.paramsSchemas.parse.is_binary,
        },
        'raw': {
            ...MVSTreeSchema.paramsSchemas.raw,
            is_binary: RequiredField(t.boolean),
            // is_binary: MVSTreeSchema.paramsSchemas.parse.is_binary,
        },
        'parse': {
            format: RequiredField(MolstarParseFormatT),
        },
        'trajectory': {
            format: RequiredField(MolstarParseFormatT),
            block_header: MVSTreeSchema.paramsSchemas.structure.block_header,
            block_index: MVSTreeSchema.paramsSchemas.structure.block_index,
            // TODO think through and fix trajectory vs parse and model
        },
        'model': pickObjectKeys(MVSTreeSchema.paramsSchemas.structure, ['model_index' as const]),
        'structure': omitObjectKeys(MVSTreeSchema.paramsSchemas.structure, ['block_header', 'block_index', 'model_index' as const]),
        'color-from-url': {
            ...MVSTreeSchema.paramsSchemas['color-from-url'],
            background: MVSTreeSchema.paramsSchemas.representation.color,
        }
    }
);


export type MolstarKind = keyof typeof MolstarTreeSchema.paramsSchemas;

export type MolstarNode<TKind extends MolstarKind = MolstarKind> = NodeForTree<typeof MolstarTreeSchema, TKind>

export type MolstarTree = TreeFor<typeof MolstarTreeSchema>

console.log('Molstar model params schema:', MolstarTreeSchema.paramsSchemas.model);