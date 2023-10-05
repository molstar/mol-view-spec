/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { canonicalJsonString, formatObject } from '../../helpers/utils';
import { Kind, SubTree, SubTreeOfKind, Tree, getParams } from './generic';


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

export type ConversionRules<A extends Tree, B extends Tree> = {
    [kind in Kind<SubTree<A>>]?: (node: SubTreeOfKind<A, kind>, parent?: SubTree<A>) => SubTree<B>[]
};

export function convertTree<A extends Tree, B extends Tree>(root: A, conversions: ConversionRules<A, B>): SubTree<B> {
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

/** Create a copy of the tree where twins (siblings of the same kind with the same params) are merged into one node.
 * Applies only to the node kinds listed in `condenseNodes` (or all if undefined) except node kinds in `skipNodes`. */
export function condenseTree<T extends Tree>(root: T, condenseNodes?: Set<Kind<Tree>>, skipNodes?: Set<Kind<Tree>>): T {
    const map = new Map<string, SubTree<T>>();
    const result = copyTree(root);
    dfs<T>(result, node => {
        map.clear();
        const newChildren: SubTree<T>[] = [];
        for (const child of node.children ?? []) {
            let twin: SubTree<T> | undefined = undefined;
            const doApply = (!condenseNodes || condenseNodes.has(child.kind)) && !skipNodes?.has(child.kind);
            if (doApply) {
                const key = child.kind + canonicalJsonString(getParams(child));
                twin = map.get(key);
                if (!twin) map.set(key, child);
            }
            if (twin) {
                (twin.children ??= []).push(...child.children ?? []);
            } else {
                newChildren.push(child as SubTree<T>);
            }
        }
        node.children = newChildren;
    });
    return result;
}
