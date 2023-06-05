
export type Node<TKind extends string = string, TParams extends {} = {}> = {
    kind: TKind,
    params?: TParams,
}
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
