import { MolstarKind, MolstarTreeSchema } from './tree/molstar-nodes';
import { DefaultsFor } from './tree/params-schema';


export const Defaults = {
    root: {},
    download: {
        is_binary: false,
    },
    raw: {
        data: 'DEFAULT_DATA',
        is_binary: false,
    },
    parse: {
        format: 'mmcif',
    },
    model: {
        model_index: 0,
    },
    structure: {
        assembly_id: '1', // TODO fix; For know I'm puting `undefined` with meaning "use deposited model"
    },
    component: {
        selector: 'all',
    },
    representation: {
        color: 'white',
    },
    color: {
        color: 'red',
        label_asym_id: '',
        label_seq_id: 0,
    },
} satisfies { [kind in MolstarKind]?: DefaultsFor<(typeof MolstarTreeSchema)['paramsSchemas'][kind]> };
// TODO add all node kinds and remove ? in the type hint
// } satisfies { [kind in Kind<MolstarTree>]?: ParamsOfKind<MolstarTree, kind> };
// TODO mandatory params don't need to be here
// TODO apply default to MVS tree (before conversion), not Molstar tree
