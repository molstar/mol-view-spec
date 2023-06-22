import { MolstarKind, MolstarTreeSchema } from './tree/molstar-nodes';
import { MVSKind, MVSTreeSchema } from './tree/mvs-nodes';
import { DefaultsFor } from './tree/params-schema';


export const Defaults = {
    root: {},
    download: {
    },
    raw: {
        data: 'DEFAULT_DATA',
    },
    parse: {
        is_binary: false,
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
    label: {
        label_asym_id: null,
        label_entity_id: null,
        label_seq_id: null,
        auth_asym_id: null,
        auth_seq_id: null,
        pdbx_PDB_ins_code: null,
        beg_label_seq_id: null,
        end_label_seq_id: null,
        beg_auth_seq_id: null,
        end_auth_seq_id: null,
    },
    'label-from-cif': {
    },
    color: {
        label_asym_id: null,
        label_entity_id: null,
        label_seq_id: null,
        auth_asym_id: null,
        auth_seq_id: null,
        pdbx_PDB_ins_code: null,
        beg_label_seq_id: null,
        end_label_seq_id: null,
        beg_auth_seq_id: null,
        end_auth_seq_id: null,
        tooltip: null,
    },
    'color-from-cif': {
    },

} satisfies { [kind in MVSKind]: DefaultsFor<(typeof MVSTreeSchema)['paramsSchemas'][kind]> };
// TODO add all node kinds and remove ? in the type hint
// } satisfies { [kind in Kind<MolstarTree>]?: ParamsOfKind<MolstarTree, kind> };
// TODO mandatory params don't need to be here
// TODO apply default to MVS tree (before conversion), not Molstar tree
