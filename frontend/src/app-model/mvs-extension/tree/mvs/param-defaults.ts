/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { MVSKind, MVSTreeSchema } from './mvs-tree';
import { DefaultsFor } from '../generic/params-schema';


export const Defaults = {
    root: {},
    download: {
    },
    raw: {
        data: 'DEFAULT_DATA',
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
        selector: 'all',
    },
    'component-from-url': {
        category_name: null,
        field_name: 'component',
        block_index: null,
        block_header: null,
        field_values: null,
    },
    'component-from-cif': {
        category_name: null,
        field_name: 'component',
        block_index: null,
        block_header: null,
        field_values: null,
    },
    representation: {
    },
    'color': {
        selector: 'all',
    },
    'color-from-url': {
        category_name: null,
        field_name: 'color',
        block_index: null,
        block_header: null,
    },
    'color-from-cif': {
        category_name: null,
        field_name: 'color',
        block_index: null,
        block_header: null,
    },
    'label': {
    },
    'label-from-url': {
        category_name: null,
        field_name: 'label',
        block_index: null,
        block_header: null,
    },
    'label-from-cif': {
        category_name: null,
        field_name: 'label',
        block_index: null,
        block_header: null,
    },
    'tooltip': {
    },
    'tooltip-from-url': {
        category_name: null,
        field_name: 'tooltip',
        block_index: null,
        block_header: null,
    },
    'tooltip-from-cif': {
        category_name: null,
        field_name: 'tooltip',
        block_index: null,
        block_header: null,
    },
    'focus': {
        direction: [0, 0, -1],
        up: [0, 1, 0],
    },
    'transform': {
        rotation: null,
        translation: null,
    },
    'canvas': {
    },
    'camera': {
        up: [0, 1, 0],
    },
} satisfies { [kind in MVSKind]: DefaultsFor<(typeof MVSTreeSchema)['paramsSchemas'][kind]> };
// TODO apply default to MVS tree (before conversion), not Molstar tree

export const DefaultColor = 'white';
