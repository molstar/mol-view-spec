
export interface Node_<TKind extends string, TParams extends {}> {
    kind: TKind,
    params?: TParams,
    children?: Node_<any, any>[],
    // parent?: _Node<any, any>, // ?
}

export type NodeTypes = Node_<string, any>[]
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