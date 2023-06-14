import * as t from 'io-ts';

import { RequiredField, ParamsSchema, choice, OptionalField } from './params-schema';


interface NodeSchema<TKind extends string = string, TParamsSchema extends ParamsSchema = ParamsSchema> {
    kind: TKind,
    paramsSchema: TParamsSchema,
}
function NodeSchema<TKind extends string, TParamsSchema extends ParamsSchema>(kind: TKind, paramsSchema: TParamsSchema): NodeSchema<TKind, TParamsSchema> {
    return { kind, paramsSchema };
}

type NodeFor<TNodeSchema extends NodeSchema> =
    TNodeSchema extends NodeSchema<infer K, infer P>
    ? Node<K, { [key in keyof P as P[key] extends RequiredField<any> ? key : never]: P[key] extends RequiredField<infer V> ? V : never }
        & { [key in keyof P as P[key] extends OptionalField<any> ? key : never]?: P[key] extends OptionalField<infer V> ? V : never }>
    : never
// Inlining this crazy stuff to get better type display :/ Equivalent nicer formululation here:
// type NodeFor_ReferenceImplementation<TNodeSchema extends NodeSchema> = TNodeSchema extends NodeSchema<infer K, infer P> ? Node<K, ValuesFor<P>> : never

const n = NodeSchema('parse', {
    format: RequiredField(choice('pdb', 'mmcif')),
    is_binary: OptionalField(t.boolean),
});
const c = NodeSchema('color', {
    color: OptionalField(choice('red', 'green')),
    chain: OptionalField(t.string),
});
const nn: NodeFor<typeof n> = { kind: 'parse', params: { format: 'mmcif', is_binary: false } }
const cc: NodeFor<typeof c> = { kind: 'color', params: { 'chain': 'mmcif' } }


export type Node<TKind extends string = string, TParams extends {} = {}> =
    {} extends TParams ?
    {
        kind: TKind,
        params?: TParams,
    } : {
        kind: TKind,
        params: TParams,
    }
// params can be dropped if {} is valid value for params

export type Kind<TTree extends Node> = TTree['kind']
export type Params<TTree extends Node> = NonNullable<TTree['params']>

export type Rename<TKind extends string, TNode extends Node> = Node<TKind, Params<TNode>>
export type PickParams<TNode extends Node, TKeys extends keyof Params<TNode>> = Node<TNode['kind'], Pick<Params<TNode>, TKeys>>
export type OmitParams<TNode extends Node, TKeys extends keyof Params<TNode>> = Node<TNode['kind'], Omit<Params<TNode>, TKeys>>


export type Tree<TNode extends Node<string, {}> = Node<string, {}>, TRoot extends TNode = TNode> =
    TRoot & {
        children?: Tree<TNode, TNode>[],
    }

export type SubTree<TTree extends Tree> = NonNullable<TTree['children']>[number]
type RootOfKind<TTree extends Tree, TKind extends Kind<TTree>> = Extract<TTree, Tree<any, Node<TKind>>>
export type SubTreeOfKind<TTree extends Tree, TKind extends Kind<SubTree<TTree>>> = RootOfKind<SubTree<TTree>, TKind>
export type ParamsOfKind<TTree extends Tree, TKind extends Kind<TTree> = Kind<TTree>> = NonNullable<SubTreeOfKind<TTree, TKind>['params']>
