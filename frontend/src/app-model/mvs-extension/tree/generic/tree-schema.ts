/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { isReallyObject, mapObjToObj, onelinerJsonString } from '../../helpers/utils';
import { AllRequired, DefaultsFor, ParamsSchema, ValuesFor, paramsValidationIssues } from './params-schema';
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
export type SubTreeOfKind<TTree extends Tree, TKind extends Kind<SubTree<TTree>> = Kind<SubTree<TTree>>> = RootOfKind<SubTree<TTree>, TKind>
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


type ParamsSchemas = { [kind: string]: ParamsSchema }

/** Definition of tree type, specifying allowed node kinds, types of their params, and the required kind for the root */
export interface TreeSchema<TParamsSchemas extends ParamsSchemas = ParamsSchemas, TRootKind extends keyof TParamsSchemas = string> {
    rootKind: TRootKind,
    nodes: {
        [kind in keyof TParamsSchemas]: {
            params: TParamsSchemas[kind],
            description?: string,
            parent?: (string & keyof TParamsSchemas)[],
        }
    },
}
export function TreeSchema<P extends ParamsSchemas = ParamsSchemas, R extends keyof P = string>(schema: TreeSchema<P, R>): TreeSchema<P, R> {
    return schema as any;
}

/** ParamsSchemas per node kind */
type ParamsSchemasOf<TTreeSchema extends TreeSchema> = TTreeSchema extends TreeSchema<infer TParamsSchema, any> ? TParamsSchema : never;


/** Variation of schema `TTreeSchema` where all param fields are required */
export type TreeWithAllRequired<TTreeSchema extends TreeSchema> = {
    rootKind: TTreeSchema['rootKind'],
    nodes: {
        [kind in keyof TTreeSchema['nodes']]: {
            params: AllRequired<TTreeSchema['nodes'][kind]['params']>,
            description?: string,
            parent?: TTreeSchema['nodes'][kind]['parent'],
        }
    },
}

/** Create of copy of a params schema where all fields are required */
export function TreeWithAllRequired<TTreeSchema extends TreeSchema>(schema: TTreeSchema): TreeWithAllRequired<TTreeSchema> {
    return {
        ...schema,
        nodes: mapObjToObj(schema.nodes, (kind, node) => ({ ...node, params: AllRequired(node.params) })) as any,
    };
}

/** Type of tree node which can occur anywhere in a tree conforming to tree schema `TTreeSchema`,
 * optionally narrowing down to a given node kind */

export type NodeForTree<TTreeSchema extends TreeSchema, TKind extends keyof ParamsSchemasOf<TTreeSchema> = keyof ParamsSchemasOf<TTreeSchema>>
    = { [key in keyof ParamsSchemasOf<TTreeSchema>]: Node<key & string, ValuesFor<ParamsSchemasOf<TTreeSchema>[key]>> }[TKind]

/** Type of tree node which can occur as the root of a tree conforming to tree schema `TTreeSchema` */
export type RootForTree<TTreeSchema extends TreeSchema> = NodeForTree<TTreeSchema, TTreeSchema['rootKind']>

/** Type of tree which conforms to tree schema `TTreeSchema` */
export type TreeFor<TTreeSchema extends TreeSchema> = Tree<NodeForTree<TTreeSchema>, RootForTree<TTreeSchema> & NodeForTree<TTreeSchema>>

/** Type of default parameter values for each node kind in a tree schema `TTreeSchema` */
export type DefaultsForTree<TTreeSchema extends TreeSchema> = { [kind in keyof TTreeSchema['nodes']]: DefaultsFor<TTreeSchema['nodes'][kind]['params']> }


/** Return `undefined` if a tree conforms to the given schema,
 * return validation issues (as a list of lines) if it does not conform.
 * If `options.requireAll`, all parameters (including optional) must have a value provided.
 * If `options.noExtra` is true, presence of any extra parameters is treated as an issue.
 * If `options.anyRoot` is true, the kind of the root node is not enforced.
 */
export function treeValidationIssues(schema: TreeSchema, tree: Tree, options: { requireAll?: boolean, noExtra?: boolean, anyRoot?: boolean, parent?: string } = {}): string[] | undefined {
    if (!isReallyObject(tree)) return [`Node must be an object, not ${tree}`];
    if (!options.anyRoot && tree.kind !== schema.rootKind) return [`Invalid root node kind "${tree.kind}", root must be of kind "${schema.rootKind}"`];
    const nodeSchema = schema.nodes[tree.kind];
    if (!nodeSchema) return [`Unknown node kind "${tree.kind}"`];
    if (nodeSchema.parent && (options.parent !== undefined) && !nodeSchema.parent.includes(options.parent)) {
        return [`Node of kind "${tree.kind}" cannot appear as a child of "${options.parent}". Allowed parents for "${tree.kind}" are: ${nodeSchema.parent.map(s => `"${s}"`).join(', ')}`];
    }
    const issues = paramsValidationIssues(nodeSchema.params, getParams(tree), options);
    if (issues) return [`Invalid parameters for node of kind "${tree.kind}":`, ...issues.map(s => '  ' + s)];
    for (const child of getChildren(tree)) {
        const issues = treeValidationIssues(schema, child, { ...options, anyRoot: true, parent: tree.kind });
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

function treeSchemaToString_<TSchema extends TreeSchema>(schema: TSchema, defaults?: DefaultsForTree<TSchema>, markdown: boolean = false): string {
    const out: string[] = [];
    const bold = (str: string) => markdown ? `**${str}**` : str;
    const code = (str: string) => markdown ? `\`${str}\`` : str;
    out.push(`Tree schema:`);
    for (const kind in schema.nodes) {
        const { description, params, parent } = schema.nodes[kind];
        out.push(`  - ${bold(code(kind))}`);
        if (kind === schema.rootKind) {
            out.push('    [Root of the tree must be of this kind]');
        }
        if (description) {
            out.push(`    ${description}`);
        }
        out.push(`    Parent: ${!parent ? 'any' : parent.length === 0 ? 'none' : parent.map(code).join(' or ')}`);
        out.push(`    Params:${Object.keys(params).length > 0 ? '' : ' none'}`);
        for (const key in params) {
            const field = params[key];
            let typeString = field.type.name;
            if (typeString.startsWith('(') && typeString.endsWith(')')) {
                typeString = typeString.slice(1, -1);
            }
            out.push(`      - ${bold(code(key + (field.required ? ': ' : '?: ')))}${code(typeString)}`);
            const defaultValue = (defaults?.[kind] as any)?.[key];
            if (field.description) {
                out.push(`        ${field.description}`);
            }
            if (defaultValue !== undefined) {
                out.push(`        Default: ${code(onelinerJsonString(defaultValue))}`);
            }
        }
    }
    return out.join(markdown ? '\n\n' : '\n');
}

export function treeSchemaToString<TSchema extends TreeSchema>(schema: TSchema, defaults?: DefaultsForTree<TSchema>): string {
    return treeSchemaToString_(schema, defaults, false);
}
export function treeSchemaToMarkdown<TSchema extends TreeSchema>(schema: TSchema, defaults?: DefaultsForTree<TSchema>): string {
    return treeSchemaToString_(schema, defaults, true);
}
