import * as GeneralTree from './general-nodes';

export type NodeTypes = [
    GeneralTree.Node_<'root', {}>,
    GeneralTree.Node_<'download', {
        url: string,
    }>,
    GeneralTree.Node_<'parse', {
        format: ParseFormatT,
        is_binary?: boolean,
    }>,
    GeneralTree.Node_<'structure', {
        assembly_id?: string,
        model_index?: number,
    }>,
    GeneralTree.Node_<'component', {
        selector: ComponentSelectorT,
    }>,
    GeneralTree.Node_<'representation', {
        type: RepresentationTypeT,
        color?: ColorT,
    }>,
    GeneralTree.Node_<'label', {
        label_asym_id: string,
        label_seq_id: number,
        text: string,
    }>,
    GeneralTree.Node_<'label-from-cif', {
        category_name: string,
    }>,
    GeneralTree.Node_<'color', {
        label_asym_id: string,
        label_seq_id: number,
        color: ColorT,
    }>,
    GeneralTree.Node_<'color-from-cif', {
        category_name: string,
    }>,
]



export type Kind = GeneralTree.Kind<NodeTypes>;
export type Node<K extends Kind = any> = GeneralTree.Node<NodeTypes, K>;
export type Params<K extends Kind> = GeneralTree.Params<NodeTypes, K>;

export type ParseFormatT = 'mmcif' | 'pdb'
export type ComponentSelectorT = 'all' | 'polymer' | 'protein' | 'nucleic' | 'ligand' | 'ion' | 'water'
export type RepresentationTypeT = 'ball-and-stick' | 'cartoon' | 'surface'
export type ColorT = 'red' | 'white' | 'blue'  // presumably this is a general type and will be useful elsewhere
// TODO possible to type for hex color strings here?
