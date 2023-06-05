import { Node, OmitParams, Params, Tree } from './generic';
import { MVSNode } from './mvs';


export namespace MolstarNode {
    export type Root = MVSNode.Root
    export type Download = Node<'download', Params<MVSNode.Download> & Pick<Params<MVSNode.Parse>, 'is_binary'>>
    export type Raw = Node<'raw', Params<MVSNode.Raw> & Pick<Params<MVSNode.Parse>, 'is_binary'>>
    export type Parse = OmitParams<MVSNode.Parse, 'is_binary'>
    export type Model = Node<'model', Pick<Params<MVSNode.Structure>, 'model_index'>>
    export type Structure = OmitParams<MVSNode.Structure, 'model_index'>
    export type Component = MVSNode.Component
    export type Representation = MVSNode.Representation
    export type Label = MVSNode.Label
    export type LabelFromCif = MVSNode.LabelFromCif
    export type Color = MVSNode.Color
    export type ColorFromCif = MVSNode.ColorFromCif

    export type Any = Root | Download | Raw | Parse | Model | Structure | Component | Representation | Label | LabelFromCif | Color | ColorFromCif
}

export type MolstarNode = MolstarNode.Any

export type MolstarTree = Tree<MolstarNode>
