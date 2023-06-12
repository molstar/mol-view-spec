import { deepEqual } from 'molstar/lib/mol-util';

import { Kind, SubTree, SubTreeOfKind, Tree } from './generic';
import * as MolstarNodes from './molstar-nodes';
import * as MVSNodes from './mvs-nodes';
import { formatObject, omitObjectKeys, pickObjectKeys } from '../utils';


export type MolstarTree = Tree<MolstarNodes.Any>
export type MVSTree = Tree<MVSNodes.Any>


function _dfs<TTree extends Tree>(root: TTree, parent: SubTree<TTree> | undefined, visit?: (node: SubTree<TTree>, parent?: SubTree<TTree>) => any, postVisit?: (node: SubTree<TTree>, parent?: SubTree<TTree>) => any) {
    if (visit) visit(root, parent);
    for (const child of root.children ?? []) {
        _dfs<SubTree<TTree>>(child, root, visit, postVisit);
    }
    if (postVisit) postVisit(root, parent);
}

export function dfs<TTree extends Tree>(root: TTree, visit?: (node: SubTree<TTree>, parent?: SubTree<TTree>) => any, postVisit?: (node: SubTree<TTree>, parent?: SubTree<TTree>) => any) {
    return _dfs<SubTree<TTree>>(root, undefined, visit, postVisit);
}

export function treeToString(tree: Tree) {
    let level = 0;
    const lines: string[] = [];
    dfs(tree, node => lines.push('  '.repeat(level++) + `- ${node.kind} ${formatObject(node.params ?? {})}`), node => level--);
    return lines.join('\n');
}

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

export function copyTree<T extends Tree>(root: T): T {
    return convertTree(root, {}) as T;
}

export function convertTree<A extends B, B extends Tree>(root: A, conversions: { [kind in Kind<SubTree<A>>]?: (node: SubTreeOfKind<A, kind>, parent?: SubTree<A>) => SubTree<B>[] }): SubTree<B> {
    const mapping = new Map<SubTree<A>, SubTree<B>>();
    let convertedRoot: SubTree<B>;
    dfs<A>(root, (node, parent) => {
        const conversion = conversions[node.kind as (typeof node)['kind']] as ((n: typeof node, p?: SubTree<A>) => SubTree<B>[]) | undefined;
        if (conversion) {
            const convertidos = conversion(node, parent);
            if (!parent && convertidos.length === 0) throw new Error('Cannot convert root to empty path');
            let convParent = parent ? mapping.get(parent) : undefined;
            for (const conv of convertidos) {
                if (convParent) {
                    (convParent.children ??= []).push(conv);
                } else {
                    convertedRoot = conv;
                }
                convParent = conv;
            }
            mapping.set(node, convParent!);
        } else {
            const converted = copyNodeWithoutChildren(node);
            if (parent) {
                (mapping.get(parent)!.children ??= []).push(converted);
            } else {
                convertedRoot = converted;
            }
            mapping.set(node, converted);
        }
    });
    return convertedRoot!;
}

export function condenseTree<T extends Tree>(root: T): T {
    const result = copyTree(root);
    dfs<T>(result, (node, parent) => {
        const newChildren: SubTree<T>[] = [];
        for (const child of node.children ?? []) {
            const twin = newChildren.find(sibling => sibling.kind === child.kind && deepEqual(sibling.params, child.params));
            // Using .find could be inefficient when their are too many children. TODO implement using a set, if we expect big numbers of children (e.g. one label per each residue?)
            if (twin) {
                (twin.children ??= []).push(...child.children ?? [])
            } else {
                newChildren.push(child as SubTree<T>);
            }
        }
        node.children = newChildren;
    });
    return result;
}


/** Convert MolViewSpec tree into MolStar tree */
export function convertMvsToMolstar(mvsTree: MVSTree): MolstarTree {
    const converted = convertTree<MVSTree, MolstarTree>(mvsTree, {
        'download': node => [],
        'raw': node => [],
        'parse': (node, parent) => {
            const moveParams = node.params && pickObjectKeys(node.params, ['is_binary']);
            const keepParams = node.params && omitObjectKeys(node.params, ['is_binary']);
            if (parent?.kind === 'download') return [
                { kind: 'download', params: { ...parent.params, ...moveParams } },
                { kind: 'parse', params: keepParams }
            ];
            if (parent?.kind === 'raw') return [
                { kind: 'raw', params: { ...parent.params, ...moveParams } },
                { kind: 'parse', params: keepParams }
            ];
            console.warn('"parse" node is not being converted, this is suspicious');
            return [copyNodeWithoutChildren(node)];
        },
        'structure': node => [
            { kind: 'model', params: node.params && pickObjectKeys(node.params, ['model_index']) },
            { kind: 'structure', params: node.params && omitObjectKeys(node.params, ['model_index']) },
        ],
    });
    const condensed = condenseTree<MolstarTree>(converted);
    // TODO think if for all node kinds it makes sense to condense? 
    // (e.g. how would we make 2 structures from same cif, one of them rotated)
    return condensed;
}
