import { Node } from './generic';
import { ColorT, ComponentSelectorT, ParseFormatT, RepresentationTypeT } from './param-types';


export type Root = Node<'root', {}>
export type Download = Node<'download', {
    url: string,
}>
/** Raw node is not in the mol-view-spec proposal, now it's here for testing, TODO remove */
export type Raw = Node<'raw', {
    data?: string,
}>
export type Parse = Node<'parse', {
    format: ParseFormatT,
    is_binary?: boolean,
}>
export type Structure = Node<'structure', {
    assembly_id?: string,
    model_index?: number,
}>
export type Component = Node<'component', {
    selector: ComponentSelectorT,
}>
export type Representation = Node<'representation', {
    type: RepresentationTypeT,
    color?: ColorT,
}>
export type Label = Node<'label', {
    label_asym_id: string,
    label_seq_id: number,
    text: string,
}>
export type LabelFromCif = Node<'label-from-cif', {
    category_name: string,
}>
export type Color = Node<'color', {
    label_asym_id: string,
    label_seq_id: number,
    color: ColorT,
}>
export type ColorFromCif = Node<'color-from-cif', {
    category_name: string,
}>

export type Any = Root | Download | Raw | Parse | Structure | Component | Representation | Label | LabelFromCif | Color | ColorFromCif
