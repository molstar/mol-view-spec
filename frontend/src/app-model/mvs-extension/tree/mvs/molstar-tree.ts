/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { omitObjectKeys, pickObjectKeys } from '../../helpers/utils';
import { RequiredField, bool } from '../generic/params-schema';
import { NodeForTree, TreeFor, TreeSchema } from '../generic/tree-schema';
import { FullMVSTreeSchema } from './mvs-tree';
import { MolstarParseFormatT } from './param-types';


/** Schema for `MolstarTree` (auxiliary tree representation before creating a real Molstar state) */
export const MolstarTreeSchema = TreeSchema({
    rootKind: 'root',
    nodes: {
        ...FullMVSTreeSchema.nodes,
        download: {
            ...FullMVSTreeSchema.nodes.download,
            params: {
                ...FullMVSTreeSchema.nodes.download.params,
                is_binary: RequiredField(bool),
            },
        },
        parse: {
            ...FullMVSTreeSchema.nodes.parse,
            params: {
                format: RequiredField(MolstarParseFormatT),
            },
        },
        /** Auxiliary node corresponding to Molstar's TrajectoryFrom*. */
        trajectory: {
            description: "Auxiliary node corresponding to Molstar's TrajectoryFrom*.",
            params: {
                format: RequiredField(MolstarParseFormatT),
                ...pickObjectKeys(FullMVSTreeSchema.nodes.structure.params, ['block_header', 'block_index'] as const),
            },
        },
        /** Auxiliary node corresponding to Molstar's ModelFromTrajectory. */
        model: {
            description: "Auxiliary node corresponding to Molstar's ModelFromTrajectory.",
            params: pickObjectKeys(FullMVSTreeSchema.nodes.structure.params, ['model_index'] as const),
        },
        structure: {
            ...FullMVSTreeSchema.nodes.structure,
            params: omitObjectKeys(FullMVSTreeSchema.nodes.structure.params, ['block_header', 'block_index', 'model_index'] as const),
        },
        /** Auxiliary node collecting multiple transform nodes. */
        transforms: {
            description: 'Auxiliary node collecting multiple transform nodes.',
            params: {},
        },
    }
});


/** Node kind in a `MolstarTree` */
export type MolstarKind = keyof typeof MolstarTreeSchema.nodes;

/** Node in a `MolstarTree` */
export type MolstarNode<TKind extends MolstarKind = MolstarKind> = NodeForTree<typeof MolstarTreeSchema, TKind>

/** Auxiliary tree representation before creating a real Molstar state */
export type MolstarTree = TreeFor<typeof MolstarTreeSchema>
