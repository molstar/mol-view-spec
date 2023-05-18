
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
export type RootOfKind<TTree extends Tree, TKind extends Kind<TTree>> = Extract<TTree, Tree<any, Node<TKind>>>
export type NodeOfKind<TTree extends Tree, TKind extends Kind<SubTree<TTree>>> = RootOfKind<SubTree<TTree>, TKind>

// export type NodeOf<TTree extends Tree, TKind extends Kind<SubTree<TTree>>> = Extract<SubTree<TTree>, Tree<any, ChildlessNode<TKind>>>
export type ParamsOfKind<TTree extends Tree, TKind extends Kind<TTree> = Kind<TTree>> = NonNullable<NodeOfKind<TTree, TKind>['params']>

const x: Tree<Node<'download', { url: string }> | Node<'parse', { format: string }>, Node<'download', { url: string }>> = {} as any;
type t1 = Tree<Node<'download', { url: string }> | Node<'parse', { format: string }>>

type t2 = typeof x
type t4 = RootOfKind<SubTree<t2>, 'parse'>
type t5 = NodeOfKind<t2, 'parse'>

const y: t5 = { kind: 'parse', params: { format: 'mmcif' }, children: [{ kind: 'download', params: { url: '' } }, { kind: 'parse', params: { format: 'mmcif' } }] }


export function copyNodeWithoutChildren<TTree extends Tree>(node: TTree): TTree {
    return {
        kind: node.kind,
        params: node.params ? { ...node.params } : undefined,
    } as TTree;
}
export function copyNode<TTree extends Tree>(node: TTree): TTree {
    return {
        kind: node.kind,
        params: node.params ? { ...node.params } : undefined,
        children: node.children ? [...node.children] : undefined,
    } as TTree;
}
