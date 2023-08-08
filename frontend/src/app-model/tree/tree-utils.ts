import { deepEqual } from 'molstar/lib/mol-util';

import { formatObject, omitObjectKeys, pickObjectKeys } from '../utils';
import { Kind, ParamsOfKind, SubTree, SubTreeOfKind, Tree } from './generic';
import { MolstarNode, MolstarTree } from './molstar-nodes';
import { MVSTree } from './mvs-nodes';
import { ParseFormatMvsToMolstar } from './param-types';


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

export function convertTree<A extends Tree, B extends Tree>(root: A, conversions: { [kind in Kind<SubTree<A>>]?: (node: SubTreeOfKind<A, kind>, parent?: SubTree<A>) => SubTree<B>[] }): SubTree<B> {
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
                (twin.children ??= []).push(...child.children ?? []);
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
            const { format, is_binary } = ParseFormatMvsToMolstar[node.params.format];
            const convertedNode: MolstarNode<'parse'> = { kind: 'parse', params: { ...node.params, format } };
            switch (parent?.kind) {
                case 'download':
                    return [
                        { kind: 'download', params: { ...parent.params, is_binary } },
                        convertedNode,
                    ] satisfies MolstarNode[];
                case 'raw':
                    return [
                        { kind: 'raw', params: { ...parent.params, is_binary } },
                        convertedNode,
                    ] satisfies MolstarNode[];
                default:
                    console.warn('"parse" node is not being converted, this is suspicious');
                    return [convertedNode] satisfies MolstarNode[];
            }
        },
        'structure': (node, parent) => {
            if (parent?.kind !== 'parse') throw new Error('Parent of "structure" must be "parse".');
            const { format } = ParseFormatMvsToMolstar[parent.params.format];
            return [
                { kind: 'trajectory', params: { format, ...pickObjectKeys(node.params, ['block_header', 'block_index']) } },
                { kind: 'model', params: pickObjectKeys(node.params, ['model_index']) },
                { kind: 'structure', params: omitObjectKeys(node.params, ['block_header', 'block_index', 'model_index']) },
            ] satisfies MolstarNode[];
        },
        'color-from-url': (node, parent) => {
            const newParams: ParamsOfKind<SubTree<MolstarTree>, 'color-from-url'> = { ...node.params };
            if (parent?.kind === 'representation' && parent.params.color !== undefined) {
                newParams.background = parent.params.color;
            }
            return [
                { kind: 'color-from-url', params: newParams }
                // { kind: 'trajectory', params: { ...pickObjectKeys(parent.params, ['format']), ...pickObjectKeys(node.params, ['block_header', 'block_index']) } },
                // { kind: 'model', params: pickObjectKeys(node.params, ['model_index']) },
                // { kind: 'structure', params: omitObjectKeys(node.params, ['block_header', 'block_index', 'model_index']) },
            ] satisfies MolstarNode[];
        },
    });
    const condensed = condenseTree<MolstarTree>(converted as MolstarTree);
    // TODO think if for all node kinds it makes sense to condense?
    // (e.g. how would we make 2 structures from same cif, one of them rotated)
    return condensed;
}
