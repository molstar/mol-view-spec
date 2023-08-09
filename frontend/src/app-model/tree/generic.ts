import { ParamsSchema, ValuesFor, paramsValidationIssues } from './params-schema';


export type Node<TKind extends string = string, TParams extends {} = {}> =
    {} extends TParams ? {
        kind: TKind,
        params?: TParams,
    } : {
        kind: TKind,
        params: TParams,
    } // params can be dropped if {} is valid value for params

export type Kind<TTree extends Node> = TTree['kind']
export type Params<TTree extends Node> = NonNullable<TTree['params']>


export type Tree<TNode extends Node<string, {}> = Node<string, {}>, TRoot extends TNode = TNode> =
    TRoot & {
        children?: Tree<TNode, TNode>[],
    }

export type SubTree<TTree extends Tree> = NonNullable<TTree['children']>[number]
type RootOfKind<TTree extends Tree, TKind extends Kind<TTree>> = Extract<TTree, Tree<any, Node<TKind>>>
export type SubTreeOfKind<TTree extends Tree, TKind extends Kind<SubTree<TTree>>> = RootOfKind<SubTree<TTree>, TKind>
export type ParamsOfKind<TTree extends Tree, TKind extends Kind<SubTree<TTree>> = Kind<TTree>> = NonNullable<SubTreeOfKind<TTree, TKind>['params']>


export function getParams<TNode extends Node>(node: TNode): Params<TNode> {
    return node.params ?? {};
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


export type NodeForTree<TTreeSchema extends TreeSchema, TKind extends keyof TTreeSchema['paramsSchemas'] = keyof TTreeSchema['paramsSchemas']> = TTreeSchema extends TreeSchema<infer TSchemas, any>
    ? { [key in keyof TSchemas]: Node<key & string, ValuesFor<TSchemas[key]>> }[TKind]
    : never

export type RootForTree<TTreeSchema extends TreeSchema> = NodeForTree<TTreeSchema, TTreeSchema['rootKind']>

export type TreeFor<TTreeSchema extends TreeSchema> = Tree<NodeForTree<TTreeSchema>, RootForTree<TTreeSchema> & NodeForTree<TTreeSchema>>

export function treeValidationIssues(schema: TreeSchema, tree: Tree, options: { requireAll?: boolean, noExtra?: boolean, anyRoot?: boolean } = {}): string[] | undefined {
    if (!options.anyRoot && tree.kind !== schema.rootKind) return [`Invalid root node kind "${tree.kind}", root must be of kind "${schema.rootKind}"`];
    const paramsSchema = schema.paramsSchemas[tree.kind];
    if (!paramsSchema) return [`Unknown node kind "${tree.kind}"`];
    const issues = paramsValidationIssues(paramsSchema, getParams(tree), options);
    if (issues) return [`Invalid parameters for node of kind "${tree.kind}":`, ...issues];
    for (const child of getChildren(tree)) {
        const issues = treeValidationIssues(schema, child, { ...options, anyRoot: true });
        if (issues) return issues;
    }
    return undefined;
}
