import * as t from 'io-ts';

import { Kind, Node, NodeSchema, TreeSchema } from './generic';
import { ColorT, ComponentSelectorT, ParseFormatT, RepresentationTypeT } from './param-types';
import { OptionalField, ParamsSchema, RequiredField } from './params-schema';


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



export const MVSTreeSchema = TreeSchema(
    'root',
    {
        'root': {},
        'download': {
            url: RequiredField(t.string),
        },
        /** Raw node is not in the mol-view-spec proposal, now it's here for testing, TODO remove */
        'raw': {
            data: OptionalField(t.string),
        },
        'parse': {
            format: RequiredField(ParseFormatT),
            is_binary: OptionalField(t.boolean),
        },
        'structure': {
            assembly_id: OptionalField(t.string),
            model_index: OptionalField(t.Integer),
        },
        'component': {
            selector: RequiredField(ComponentSelectorT),
        },
        'representation': {
            type: RequiredField(RepresentationTypeT),
            color: OptionalField(ColorT),
        },
        'label': {
            label_asym_id: RequiredField(t.string),
            label_seq_id: OptionalField(t.Integer),
            text: RequiredField(t.string),
        },
        'label-from-cif': {
            category_name: RequiredField(t.string),
        },
        'color': {
            label_asym_id: RequiredField(t.string),
            label_seq_id: RequiredField(t.Integer),
            color: RequiredField(ColorT),
        },
        'color-from-cif': {
            category_name: RequiredField(t.string),
        },
    }
);
