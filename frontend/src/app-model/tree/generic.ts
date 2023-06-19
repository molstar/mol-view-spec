import * as t from 'io-ts';

import { RequiredField, ParamsSchema, choice, OptionalField, ValuesFor } from './params-schema';
import { MVSTreeSchema, Root } from './mvs-nodes';


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


export function getParams<TKind extends string, TParams extends {}>(node: Node<TKind, TParams>) {
    return node.params ?? {} as TParams;
}
export function getChildren<TTree extends Tree>(tree: TTree): SubTree<TTree>[] {
    return tree.children ?? [];
}


export interface NodeSchema<TKind extends string = string, TParamsSchema extends ParamsSchema = ParamsSchema> {
    kind: TKind,
    paramsSchema: TParamsSchema,
}
export function NodeSchema<TKind extends string, TParamsSchema extends ParamsSchema>(kind: TKind, paramsSchema: TParamsSchema): NodeSchema<TKind, TParamsSchema> {
    return { kind, paramsSchema };
}

export type NodeFor<TNodeSchema extends NodeSchema> = TNodeSchema extends NodeSchema<infer K, infer P> ? Node<K, ValuesFor<P>> : never


export interface TreeSchema<TSchemas extends { [kind: string]: ParamsSchema } = { [kind: string]: ParamsSchema }, TRootKind extends string & keyof TSchemas = string> {
    rootKind: TRootKind,
    paramsSchemas: TSchemas,
}
export function TreeSchema<TSchemas extends { [kind: string]: ParamsSchema }, TRootKind extends string & keyof TSchemas>(rootKind: TRootKind, paramsSchemas: TSchemas): TreeSchema<TSchemas, TRootKind> {
    return { rootKind, paramsSchemas };
}

export type RootForTree<TTreeSchema extends TreeSchema> = TTreeSchema extends TreeSchema<infer TSchemas, infer TRoot>
    ? Node<TRoot, ValuesFor<TSchemas[TRoot]>>
    : never

export type NodeForTree<TTreeSchema extends TreeSchema> = TTreeSchema extends TreeSchema<infer TSchemas, any>
    ? { [key in keyof TSchemas]: Node<key & string, TSchemas[key]> }[keyof TSchemas]
    : never

export type TreeFor<TTreeSchema extends TreeSchema> = Tree<NodeForTree<TTreeSchema>, RootForTree<TTreeSchema> & NodeForTree<TTreeSchema>>
