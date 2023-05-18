import { Node, OmitParams, Params, PickParams, Rename, Tree } from './nodes-generic';
import { MVSNode } from './nodes-mvs';


export namespace IntermediateNode {
    export type PreParse = Node<'pre-parse', Pick<Params<MVSNode.Parse>, 'is_binary'>>
}

export namespace MolstarNode {
    export type Parse = OmitParams<MVSNode.Parse, 'is_binary'>
    export type Model = Node<'model', Pick<Params<MVSNode.Structure>, 'model_index'>>
    export type Structure = OmitParams<MVSNode.Structure, 'model_index'>
    export type Download = Node<'download', Params<MVSNode.Download> & Params<IntermediateNode.PreParse>>
    export type Raw = Node<'raw', Params<MVSNode.Raw> & Params<IntermediateNode.PreParse>>
    export type Any = Exclude<MVSNode, MVSNode.Parse | MVSNode.Structure | MVSNode.Download>
}

export type IntermediateNode = Exclude<MVSNode, MVSNode.Parse | MVSNode.Structure> | IntermediateNode.PreParse | MolstarNode.Parse | MolstarNode.Model | MolstarNode.Structure
export type MolstarNode = Exclude<IntermediateNode, MVSNode.Download | MVSNode.Raw> | MolstarNode.Download | MolstarNode.Raw

function foo(x: IntermediateNode) {
    if (x.kind === 'parse') x.params
    if (x.kind === 'pre-parse') x.params
    if (x.kind === 'download') x.params
}

function bar(x: MolstarNode) {
    if (x.kind === 'parse') x.params
    if (x.kind === 'pre-parse') x.params
    if (x.kind === 'download') x.params
}

export type IntermediateTree1 = Tree<IntermediateNode>
export type MolstarTree = Tree<MolstarNode>

// export type Kind = GeneralTree.Kind<NodeTypes>;
// export type Node<K extends Kind = any> = GeneralTree.Node<NodeTypes, K>;
// export type Params<K extends Kind> = GeneralTree.Params<NodeTypes, K>;

export type ParseFormatT = 'mmcif' | 'pdb'
export type ComponentSelectorT = 'all' | 'polymer' | 'protein' | 'nucleic' | 'ligand' | 'ion' | 'water'
export type RepresentationTypeT = 'ball-and-stick' | 'cartoon' | 'surface'
export type ColorT = 'red' | 'white' | 'blue'  // presumably this is a general type and will be useful elsewhere
// TODO possible to type for hex color strings here?

// const x: Node<'parse'> = undefined as any;