import { omitObjectKeys, pickObjectKeys } from '../utils';
import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { MVSTreeSchema } from './mvs-nodes';
import { MolstarParseFormatT } from './param-types';
import { RequiredField, bool } from './params-schema';


export const MolstarTreeSchema = TreeSchema('root',
    {
        ...MVSTreeSchema.paramsSchemas,
        'download': {
            ...MVSTreeSchema.paramsSchemas.download,
            is_binary: RequiredField(bool),
        },
        'raw': {
            ...MVSTreeSchema.paramsSchemas.raw,
            is_binary: RequiredField(bool),
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
        /** Just to collect multiple transform nodes */
        'transforms': {},
        'color-from-url': {
            ...MVSTreeSchema.paramsSchemas['color-from-url'],
            background: MVSTreeSchema.paramsSchemas.representation.color,
        },
        'color-from-cif': {
            ...MVSTreeSchema.paramsSchemas['color-from-cif'],
            background: MVSTreeSchema.paramsSchemas.representation.color,
        },
    }
);


export type MolstarKind = keyof typeof MolstarTreeSchema.paramsSchemas;

export type MolstarNode<TKind extends MolstarKind = MolstarKind> = NodeForTree<typeof MolstarTreeSchema, TKind>

export type MolstarTree = TreeFor<typeof MolstarTreeSchema>

console.log('Molstar model params schema:', MolstarTreeSchema.paramsSchemas.model);