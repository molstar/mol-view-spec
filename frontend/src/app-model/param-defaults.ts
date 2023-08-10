import { MVSKind, MVSTreeSchema } from './tree/mvs-nodes';
import { DefaultsFor } from './tree/params-schema';

const InlineSchemaDefaults = {
    label_entity_id: null,
    label_asym_id: null,
    auth_asym_id: null,
    label_seq_id: null,
    auth_seq_id: null,
    pdbx_PDB_ins_code: null,
    beg_label_seq_id: null,
    end_label_seq_id: null,
    beg_auth_seq_id: null,
    end_auth_seq_id: null,
    atom_id: null,
    atom_index: null,
    label_atom_id: null,
    auth_atom_id: null,
};


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
    representation: {
        color: 'white',
    },
    'label-from-cif': {
    },
    'label-from-url': {
    },
    'label-from-json': {
    },
    'label-from-inline': {
        ...InlineSchemaDefaults,
    },
    'color-from-cif': {
    },
    'color-from-url': {
    },
    'color-from-json': {
    },
    'color-from-inline': {
        ...InlineSchemaDefaults,
        tooltip: null,
    },

} satisfies { [kind in MVSKind]: DefaultsFor<(typeof MVSTreeSchema)['paramsSchemas'][kind]> };
// TODO mandatory params don't need to be here
// TODO apply default to MVS tree (before conversion), not Molstar tree
