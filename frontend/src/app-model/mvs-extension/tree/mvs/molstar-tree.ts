/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { omitObjectKeys, pickObjectKeys } from '../../helpers/utils';
import { NodeForTree, TreeFor, TreeSchema } from '../generic/tree-schema';
import { RequiredField, bool } from '../generic/params-schema';
import { MVSTreeSchema } from './mvs-tree';
import { MolstarParseFormatT } from './param-types';


/** Schema for `MolstarTree` (auxiliary tree representation before creating a real Molstar state) */
export const MolstarTreeSchema = TreeSchema('root',
    {
        ...MVSTreeSchema.paramsSchemas,
        download: {
            ...MVSTreeSchema.paramsSchemas.download,
            is_binary: RequiredField(bool),
        },
        parse: {
            format: RequiredField(MolstarParseFormatT),
        },
        trajectory: {
            format: RequiredField(MolstarParseFormatT),
            block_header: MVSTreeSchema.paramsSchemas.structure.block_header,
            block_index: MVSTreeSchema.paramsSchemas.structure.block_index,
        },
        model: pickObjectKeys(MVSTreeSchema.paramsSchemas.structure, ['model_index' as const]),
        structure: omitObjectKeys(MVSTreeSchema.paramsSchemas.structure, ['block_header', 'block_index', 'model_index' as const]),
        /** Just to collect multiple transform nodes */
        transforms: {},
        color_from_uri: {
            ...MVSTreeSchema.paramsSchemas.color_from_uri,
        },
        color_from_source: {
            ...MVSTreeSchema.paramsSchemas.color_from_source,
        },
    }
);


/** Node kind in a `MolstarTree` */
export type MolstarKind = keyof typeof MolstarTreeSchema.paramsSchemas;

/** Node in a `MolstarTree` */
export type MolstarNode<TKind extends MolstarKind = MolstarKind> = NodeForTree<typeof MolstarTreeSchema, TKind>

/** Auxiliary tree representation before creating a real Molstar state */
export type MolstarTree = TreeFor<typeof MolstarTreeSchema>
