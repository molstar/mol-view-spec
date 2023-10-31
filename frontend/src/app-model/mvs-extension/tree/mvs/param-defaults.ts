/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { MVSKind, MVSTreeSchema } from './mvs-tree';
import { DefaultsFor } from '../generic/params-schema';
import { DefaultsForTree } from '../generic/tree-schema';


/** Default values for params in `MVSTree` */
export const Defaults = {
    root: {},
    download: {
    },
    parse: {
    },
    structure: {
        model_index: 0,
        assembly_id: null,
        assembly_index: null,
        block_index: null,
        block_header: null,
        radius: 0,
        ijk_min: [-1, -1, -1],
        ijk_max: [1, 1, 1],
    },
    component: {
        selector: 'all' as const,
    },
    component_from_uri: {
        category_name: null,
        field_name: 'component',
        block_index: null,
        block_header: null,
        field_values: null,
    },
    component_from_source: {
        category_name: null,
        field_name: 'component',
        block_index: null,
        block_header: null,
        field_values: null,
    },
    representation: {
    },
    color: {
        selector: 'all' as const,
    },
    color_from_uri: {
        category_name: null,
        field_name: 'color',
        block_index: null,
        block_header: null,
    },
    color_from_source: {
        category_name: null,
        field_name: 'color',
        block_index: null,
        block_header: null,
    },
    label: {
    },
    label_from_uri: {
        category_name: null,
        field_name: 'label',
        block_index: null,
        block_header: null,
    },
    label_from_source: {
        category_name: null,
        field_name: 'label',
        block_index: null,
        block_header: null,
    },
    tooltip: {
    },
    tooltip_from_uri: {
        category_name: null,
        field_name: 'tooltip',
        block_index: null,
        block_header: null,
    },
    tooltip_from_source: {
        category_name: null,
        field_name: 'tooltip',
        block_index: null,
        block_header: null,
    },
    focus: {
        direction: [0, 0, -1],
        up: [0, 1, 0],
    },
    transform: {
        rotation: null,
        translation: null,
    },
    canvas: {
    },
    camera: {
        up: [0, 1, 0],
    },
} satisfies DefaultsForTree<typeof MVSTreeSchema>;
// TODO apply default to MVS tree (before conversion), not Molstar tree

export const DefaultColor = 'white';
