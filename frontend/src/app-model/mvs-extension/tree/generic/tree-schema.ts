/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { DefaultsFor, ParamsSchema, ValuesFor, paramsValidationIssues } from './params-schema';
import { treeToString } from './tree-utils';


/** Tree node without children */
export type Node<TKind extends string = string, TParams extends {} = {}> =
    {} extends TParams ? {
        kind: TKind,
        params?: TParams,
    } : {
        kind: TKind,
        params: TParams,
    } // params can be dropped if {} is valid value for params

/** Kind type for a tree node */
export type Kind<TNode extends Node> = TNode['kind']

/** Params type for a tree node */
export type Params<TNode extends Node> = NonNullable<TNode['params']>


/** Tree (where the root node is of type `TRoot` and other nodes are of type `TNode`),
 * i.e. a node with optional children */
export type Tree<TNode extends Node<string, {}> = Node<string, {}>, TRoot extends TNode = TNode> =
    TRoot & {
        children?: Tree<TNode, TNode>[],
    }

/** Type of any subtree that can occur within given `TTree` tree type */
export type SubTree<TTree extends Tree> = NonNullable<TTree['children']>[number]

/** Type of any subtree that can occur within given `TTree` tree type and has kind type `TKind` */
export type SubTreeOfKind<TTree extends Tree, TKind extends Kind<SubTree<TTree>>> = RootOfKind<SubTree<TTree>, TKind>
type RootOfKind<TTree extends Tree, TKind extends Kind<TTree>> = Extract<TTree, Tree<any, Node<TKind>>>

/** Params type for a given kind type within a tree */
export type ParamsOfKind<TTree extends Tree, TKind extends Kind<SubTree<TTree>> = Kind<TTree>> = NonNullable<SubTreeOfKind<TTree, TKind>['params']>


/** Get params from a tree node */
export function getParams<TNode extends Node>(node: TNode): Params<TNode> {
    return node.params ?? {};
}
/** Get children from a tree node */
export function getChildren<TTree extends Tree>(tree: TTree): SubTree<TTree>[] {
    return tree.children ?? [];
}


/** Definition of tree node type, specifying its kind and types of params */
export interface NodeSchema<TKind extends string = string, TParamsSchema extends ParamsSchema = ParamsSchema> {
    kind: TKind,
    paramsSchema: TParamsSchema,
}
export function NodeSchema<TKind extends string, TParamsSchema extends ParamsSchema>(kind: TKind, paramsSchema: TParamsSchema): NodeSchema<TKind, TParamsSchema> {
    return { kind, paramsSchema };
}

/** Type of tree node which conforms to node schema `TNodeSchema` */
export type NodeFor<TNodeSchema extends NodeSchema> = TNodeSchema extends NodeSchema<infer K, infer P> ? Node<K, ValuesFor<P>> : never


/** Definition of tree type, specifying allowed node kinds, types of their params, and the required kind for the root */
export interface TreeSchema<TSchemas extends { [kind: string]: ParamsSchema } = { [kind: string]: ParamsSchema }, TRootKind extends string & keyof TSchemas = string> {
    rootKind: TRootKind,
    paramsSchemas: TSchemas,
}
export function TreeSchema<TSchemas extends { [kind: string]: ParamsSchema }, TRootKind extends string & keyof TSchemas>(rootKind: TRootKind, paramsSchemas: TSchemas): TreeSchema<TSchemas, TRootKind> {
    return { rootKind, paramsSchemas };
}


/** Type of tree node which can occur anywhere in a tree conforming to tree schema `TTreeSchema`,
 * optionally narrowing down to a given node kind */
export type NodeForTree<TTreeSchema extends TreeSchema, TKind extends keyof TTreeSchema['paramsSchemas'] = keyof TTreeSchema['paramsSchemas']> = TTreeSchema extends TreeSchema<infer TSchemas, any>
    ? { [key in keyof TSchemas]: Node<key & string, ValuesFor<TSchemas[key]>> }[TKind]
    : never

/** Type of tree node which can occur as the root of a tree conforming to tree schema `TTreeSchema` */
export type RootForTree<TTreeSchema extends TreeSchema> = NodeForTree<TTreeSchema, TTreeSchema['rootKind']>

/** Type of tree which conforms to tree schema `TTreeSchema` */
export type TreeFor<TTreeSchema extends TreeSchema> = Tree<NodeForTree<TTreeSchema>, RootForTree<TTreeSchema> & NodeForTree<TTreeSchema>>

/** Type of default parameter values for each node kind in a tree schema `TTreeSchema` */
export type DefaultsForTree<TTreeSchema extends TreeSchema> = { [kind in keyof TTreeSchema['paramsSchemas']]: DefaultsFor<(TTreeSchema)['paramsSchemas'][kind]> }

/** Return `undefined` if a tree conforms to the given schema,
 * return validation issues (as a list of lines) if it does not conform.
 * If `options.requireAll`, all parameters (including optional) must have a value provided.
 * If `options.noExtra` is true, presence of any extra parameters is treated as an issue.
 * If `options.anyRoot` is true, the kind of the root node is not enforced.
 */
export function treeValidationIssues(schema: TreeSchema, tree: Tree, options: { requireAll?: boolean, noExtra?: boolean, anyRoot?: boolean } = {}): string[] | undefined {
    if (!options.anyRoot && tree.kind !== schema.rootKind) return [`Invalid root node kind "${tree.kind}", root must be of kind "${schema.rootKind}"`];
    const paramsSchema = schema.paramsSchemas[tree.kind];
    if (!paramsSchema) return [`Unknown node kind "${tree.kind}"`];
    const issues = paramsValidationIssues(paramsSchema, getParams(tree), options);
    if (issues) return [`Invalid parameters for node of kind "${tree.kind}":`, ...issues.map(s => '  ' + s)];
    for (const child of getChildren(tree)) {
        const issues = treeValidationIssues(schema, child, { ...options, anyRoot: true });
        if (issues) return issues;
    }
    return undefined;
}

/** Validate a tree against the given schema.
 * Do nothing if OK; print validation issues on console and throw an error is the tree does not conform.
 * Include `label` in the printed output. */
export function validateTree(schema: TreeSchema, tree: Tree, label: string): void {
    const issues = treeValidationIssues(schema, tree, { noExtra: true });
    if (issues) {
        console.warn(`Invalid ${label} tree:\n${treeToString(tree)}`);
        console.error(`${label} tree validation issues:`);
        for (const line of issues) {
            console.error(' ', line);
        }
        throw new Error('FormatError');
    }
}
