import { pickObjectKeys } from '../../helpers/utils';
import { MVSData } from '../../load';
import { ParamsOfKind, SubTreeOfKind } from '../generic/tree-schema';
import { MVSKind, MVSNode, MVSTree, MVSTreeSchema, MVS_VERSION } from './mvs-tree';
import { MVSDefaults } from './mvs-defaults';
import { HexColor } from './param-types';


/** Create a new MolViewSpec builder containing only a root node. */
export function createBuilder() {
    return new Root();
}

class _Base<TKind extends MVSKind> {
    protected constructor(
        protected readonly _root: Root,
        protected readonly _node: SubTreeOfKind<MVSTree, TKind>,
    ) { }

    /** Create a new node, append as child to current _node, and return the new node */
    protected addChild<TChildKind extends MVSKind>(kind: TChildKind, params: ParamsOfKind<MVSTree, TChildKind>) {
        const allowedParamNames = Object.keys(MVSTreeSchema.nodes[kind].params) as (keyof ParamsOfKind<MVSTree, TChildKind>)[];
        const node = {
            kind,
            params: pickObjectKeys(params, allowedParamNames) as unknown,
        } as SubTreeOfKind<MVSTree, TChildKind>;
        this._node.children ??= [];
        this._node.children.push(node);
        return node;
    }

}

export class Root extends _Base<'root'> {
    constructor() {
        const node: MVSNode<'root'> = { kind: 'root' };
        super(undefined as any, node);
        (this._root as Root) = this;
    }
    getState(): MVSData {
        return { version: MVS_VERSION, root: this._node };
    }
    // omitting `saveState`, filesystem operations are responsibility of the caller code (platform-dependent)

    camera(params: ParamsOfKind<MVSTree, 'camera'>): Root {
        this.addChild('camera', params);
        return this;
    }
    canvas(params: ParamsOfKind<MVSTree, 'canvas'>): Root {
        this.addChild('canvas', params);
        return this;
    }
    download(params: ParamsOfKind<MVSTree, 'download'>): Download {
        return new Download(this._root, this.addChild('download', params));
    }
}

export class Download extends _Base<'download'> {
    parse(params: ParamsOfKind<MVSTree, 'parse'>) {
        return new Parse(this._root, this.addChild('parse', params));
    }
}

const StructureParamsSubsets = {
    model: ['block_header', 'block_index', 'model_index'],
    assembly: ['block_header', 'block_index', 'model_index', 'assembly_id', 'assembly_index'],
    symmetry: ['block_header', 'block_index', 'model_index', 'ijk_min', 'ijk_max'],
    symmetry_mates: ['block_header', 'block_index', 'model_index', 'radius'],

} satisfies { [kind in ParamsOfKind<MVSTree, 'structure'>['kind']]: (keyof ParamsOfKind<MVSTree, 'structure'>)[] };

export class Parse extends _Base<'parse'> {
    modelStructure(params: Pick<ParamsOfKind<MVSTree, 'structure'>, typeof StructureParamsSubsets['model'][number]> = {}): Structure {
        return new Structure(this._root, this.addChild('structure', {
            kind: 'model',
            ...pickObjectKeys(params, StructureParamsSubsets.model),
        }));
    }
    assemblyStructure(params: Pick<ParamsOfKind<MVSTree, 'structure'>, typeof StructureParamsSubsets['assembly'][number]> = {}): Structure {
        return new Structure(this._root, this.addChild('structure', {
            kind: 'assembly',
            ...pickObjectKeys(params, StructureParamsSubsets.assembly),
        }));
    }
    symmetryStructure(params: Pick<ParamsOfKind<MVSTree, 'structure'>, typeof StructureParamsSubsets['symmetry'][number]> = {}): Structure {
        return new Structure(this._root, this.addChild('structure', {
            kind: 'symmetry',
            ...pickObjectKeys(params, StructureParamsSubsets.symmetry),
        }));
    }
    symmetryMatesStructure(params: Pick<ParamsOfKind<MVSTree, 'structure'>, typeof StructureParamsSubsets['symmetry_mates'][number]> = {}): Structure {
        return new Structure(this._root, this.addChild('structure', {
            kind: 'symmetry_mates',
            ...pickObjectKeys(params, StructureParamsSubsets.symmetry_mates),
        }));
    }
}

export class Structure extends _Base<'structure'> {
    component(params: Partial<ParamsOfKind<MVSTree, 'component'>> = {}): Component {
        const fullParams = { ...params, selector: params.selector ?? MVSDefaults.component.selector };
        return new Component(this._root, this.addChild('component', fullParams));
    }
    componentFromUri(params: ParamsOfKind<MVSTree, 'component_from_uri'>): Component {
        return new Component(this._root, this.addChild('component_from_uri', params));
    }
    componentFromSource(params: ParamsOfKind<MVSTree, 'component_from_source'>): Component {
        return new Component(this._root, this.addChild('component_from_source', params));
    }
    labelFromUri(params: ParamsOfKind<MVSTree, 'label_from_uri'>): Structure {
        this.addChild('label_from_uri', params);
        return this;
    }
    labelFromSource(params: ParamsOfKind<MVSTree, 'label_from_source'>): Structure {
        this.addChild('label_from_source', params);
        return this;
    }
    tooltipFromUri(params: ParamsOfKind<MVSTree, 'tooltip_from_uri'>): Structure {
        this.addChild('tooltip_from_uri', params);
        return this;
    }
    tooltipFromSource(params: ParamsOfKind<MVSTree, 'tooltip_from_source'>): Structure {
        this.addChild('tooltip_from_source', params);
        return this;
    }
    transform(params: ParamsOfKind<MVSTree, 'transform'> = {}): Structure {
        if (params.rotation && params.rotation.length !== 9) {
            throw new Error('ValueError: `rotation` parameter must be an array of 9 numbers');
        }
        this.addChild('transform', params);
        return this;
    }
}

export class Component extends _Base<'component' | 'component_from_uri' | 'component_from_source'> {
    representation(params: Partial<ParamsOfKind<MVSTree, 'representation'>> = {}): Representation {
        const fullParams: ParamsOfKind<MVSTree, 'representation'> = { ...params, type: params.type ?? 'cartoon' };
        return new Representation(this._root, this.addChild('representation', fullParams));
    }
    label(params: ParamsOfKind<MVSTree, 'label'>): Component {
        this.addChild('label', params);
        return this;
    }
    tooltip(params: ParamsOfKind<MVSTree, 'tooltip'>): Component {
        this.addChild('tooltip', params);
        return this;
    }
    focus(params: ParamsOfKind<MVSTree, 'focus'> = {}): Component {
        this.addChild('focus', params);
        return this;
    }
}

export class Representation extends _Base<'representation'> {
    color(params: ParamsOfKind<MVSTree, 'color'>): Representation {
        this.addChild('color', params);
        return this;
    }
    colorFromUri(params: ParamsOfKind<MVSTree, 'color_from_uri'>): Representation {
        this.addChild('color_from_uri', params);
        return this;
    }
    colorFromSource(params: ParamsOfKind<MVSTree, 'color_from_source'>): Representation {
        this.addChild('color_from_source', params);
        return this;
    }
}


export function builderDemo() {
    const builder = createBuilder().canvas({ background_color: HexColor('#ffffff') });
    const struct = builder.download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1og2_updated.cif' }).parse({ format: 'mmcif' }).modelStructure();
    struct.component().representation().color({ color: 'white' });
    struct.component({ selector: 'ligand' }).representation({ type: 'ball_and_stick' })
        .color({ color: HexColor('#555555') })
        .color({ selector: { type_symbol: 'N' }, color: HexColor('#3050F8') })
        .color({ selector: { type_symbol: 'O' }, color: HexColor('#FF0D0D') })
        .color({ selector: { type_symbol: 'S' }, color: HexColor('#FFFF30') })
        .color({ selector: { type_symbol: 'FE' }, color: HexColor('#E06633') });
    builder.download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1og5_updated.cif' }).parse({ format: 'mmcif' }).assemblyStructure({ assembly_id: '1' }).component().representation().color({ color: 'cyan' });
    builder.download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1og5_updated.cif' }).parse({ format: 'mmcif' }).assemblyStructure({ assembly_id: '2' }).component().representation().color({ color: 'blue' });
    const cif = builder.download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1wrf_updated.cif' }).parse({ format: 'mmcif' });

    cif.modelStructure({ model_index: 0 }).component().representation().color({ color: HexColor('#CC0000') });
    cif.modelStructure({ model_index: 1 }).component().representation().color({ color: HexColor('#EE7700') });
    cif.modelStructure({ model_index: 2 }).component().representation().color({ color: HexColor('#FFFF00') });

    cif.modelStructure({ model_index: 0 }).transform({ translation: [30, 0, 0] }).component().representation().color({ color: HexColor('#ff88bb') });
    cif.modelStructure({ model_index: 0 as any }).transform({ translation: [60, 0, 0], rotation: [0, 1, 0, -1, 0, 0, 0, 0, 1] }).component().representation().color({ color: HexColor('#aa0077') });

    return builder.getState();
}
