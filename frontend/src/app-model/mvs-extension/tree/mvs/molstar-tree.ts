/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { omitObjectKeys, pickObjectKeys } from '../../helpers/utils';
import { NodeForTree, TreeFor, TreeSchema } from '../generic/generic';
import { RequiredField, bool } from '../generic/params-schema';
import { MVSTreeSchema } from './mvs-tree';
import { MolstarParseFormatT } from './param-types';


export const MolstarTreeSchema = TreeSchema('root',
    {
        ...MVSTreeSchema.paramsSchemas,
        download: {
            ...MVSTreeSchema.paramsSchemas.download,
            is_binary: RequiredField(bool),
        },
        raw: {
            ...MVSTreeSchema.paramsSchemas.raw,
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


export type MolstarKind = keyof typeof MolstarTreeSchema.paramsSchemas;

export type MolstarNode<TKind extends MolstarKind = MolstarKind> = NodeForTree<typeof MolstarTreeSchema, TKind>

export type MolstarTree = TreeFor<typeof MolstarTreeSchema>
