import { omitObjectKeys, pickObjectKeys } from '../utils';
import { NodeForTree, TreeFor, TreeSchema } from './generic';
import { MVSTreeSchema } from './mvs-nodes';


export const MolstarTreeSchema = TreeSchema(
    'root',
    {
        ...MVSTreeSchema.paramsSchemas,
        'download': {
            ...MVSTreeSchema.paramsSchemas.download,
            ...pickObjectKeys(MVSTreeSchema.paramsSchemas.parse, ['is_binary' as const]),
        },
        'raw': {
            ...MVSTreeSchema.paramsSchemas.raw,
            ...pickObjectKeys(MVSTreeSchema.paramsSchemas.parse, ['is_binary' as const]),
        },
        'parse': omitObjectKeys(MVSTreeSchema.paramsSchemas.parse, ['is_binary' as const]),
        'model': pickObjectKeys(MVSTreeSchema.paramsSchemas.structure, ['model_index' as const]),
        'structure': omitObjectKeys(MVSTreeSchema.paramsSchemas.structure, ['model_index' as const]),
    }
);


export type MolstarKind = keyof typeof MolstarTreeSchema.paramsSchemas;

export type MolstarNode<TKind extends MolstarKind = MolstarKind> = NodeForTree<typeof MolstarTreeSchema, TKind>

export type MolstarTree = TreeFor<typeof MolstarTreeSchema>
