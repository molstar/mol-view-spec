import { Kind, ParamsOfKind } from './tree/generic';
import { MolstarTree } from './tree/molstar';


export const Defaults = {
    root: {},
    download: {
        /** This is because although `url` is required, `params` in general are optional */
        url: 'DEFAULT_URL',
        is_binary: false,
    },
    raw: {
        data: 'DEFAULT_DATA',
        is_binary: false
    },
    parse: {
        format: 'mmcif',
    },
    model: {
        model_index: 0,
    },
    structure: {
        assembly_id: undefined, // For know I'm puting `undefined` with meaning "use deposited model"
    },
    component: {
        selector: 'all',
    },
    representation: {
        type: 'cartoon',
        color: 'blue',
    },
    color: {
        color: 'red',
        label_asym_id: '',
        label_seq_id: 0,
    },
} satisfies { [kind in Kind<MolstarTree>]?: ParamsOfKind<MolstarTree, kind> };
