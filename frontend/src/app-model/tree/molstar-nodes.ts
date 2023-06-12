import { Node, OmitParams, Params } from './generic';
import * as MVSNodes from './mvs-nodes';


export type Root = MVSNodes.Root
export type Download = Node<'download', Params<MVSNodes.Download> & Pick<Params<MVSNodes.Parse>, 'is_binary'>>
export type Raw = Node<'raw', Params<MVSNodes.Raw> & Pick<Params<MVSNodes.Parse>, 'is_binary'>>
export type Parse = OmitParams<MVSNodes.Parse, 'is_binary'>
export type Model = Node<'model', Pick<Params<MVSNodes.Structure>, 'model_index'>>
export type Structure = OmitParams<MVSNodes.Structure, 'model_index'>
export type Component = MVSNodes.Component
export type Representation = MVSNodes.Representation
export type Label = MVSNodes.Label
export type LabelFromCif = MVSNodes.LabelFromCif
export type Color = MVSNodes.Color
export type ColorFromCif = MVSNodes.ColorFromCif

export type Any = Root | Download | Raw | Parse | Model | Structure | Component | Representation | Label | LabelFromCif | Color | ColorFromCif
