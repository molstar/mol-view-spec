
export interface Node_<TKind extends string = string, TParams extends {} = {}> {
    kind: TKind,
    params?: TParams,
    children?: Node_[],
}

export type ChildlessNode<TKind extends string = string, TParams extends {} = {}> = {
    kind: TKind,
    params?: TParams,
}
export type ChildfulNode<TTree extends ChildlessNode<string, {}> = ChildlessNode<string, {}>, TNode extends ChildlessNode<string, {}> = TTree> =
    TNode & {
        children?: ChildfulNode<TTree, TTree>[],
    }

const x: ChildfulNode<ChildlessNode<'download', { url: string }> | ChildlessNode<'parse', { format: string }>, ChildlessNode<'download', { url: string }>> = {} as any;
const c1 = x.children![0];
if (c1.kind === 'download') c1.params?.url;
if (c1.kind === 'download') {
    const gc1 = c1.children![0];
    if (gc1.kind === 'parse') gc1.params?.format;
}

export type NodeTypes = Node_[]
export type Kind<TTree extends NodeTypes> = TTree[number]['kind'];
export type Node<TTree extends NodeTypes, T extends Kind<TTree> = Kind<TTree>> = Extract<TTree[number], Node_<T, {}>>
export type Params<TTree extends NodeTypes, T extends Kind<TTree> = Kind<TTree>> = NonNullable<Node<TTree, T>['params']>

export function copyNodeWithoutChildren<TNode extends Node_<string, any>>(node: TNode): TNode {
    // export function copyNodeWithoutChildren<TKind extends string, TParams extends {}>(node: Node_<TKind, TParams>): Node_<TKind, TParams> {
    return {
        kind: node.kind,
        params: node.params ? { ...node.params } : undefined,
    } as TNode;
}
export function copyNode<TKind extends string, TParams extends {}>(node: Node_<TKind, TParams>): Node_<TKind, TParams> {
    return {
        kind: node.kind,
        params: node.params ? { ...node.params } : undefined,
        children: node.children ? [...node.children] : undefined,
    };
}