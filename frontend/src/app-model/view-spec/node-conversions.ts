import { deepEqual } from 'molstar/lib/mol-util';
import { copyNodeWithoutChildren, Kind, NodeOfKind, SubTree, Tree } from './nodes-generic';
import { dfs } from './utils';

export function convert<TTree1 extends Tree, TTree2 extends Tree>(root: TTree1, conversions: { [kind in Kind<SubTree<TTree1>>]?: (node: NodeOfKind<TTree1, kind>, parent?: SubTree<TTree1>) => SubTree<TTree2>[] }): TTree1 | SubTree<TTree2> {
    const mapping = new Map<SubTree<TTree1>, SubTree<TTree1> | SubTree<TTree2>>();  // TODO try SubTree<TTree1> | SubTree<TTree2> -> SubTree<TTree1|TTree2>
    let convertedRoot: TTree1 | SubTree<TTree2>;
    dfs<TTree1>(root, (node, parent) => {
        const conversion = conversions[node.kind as keyof typeof conversions] as ((n: typeof node, p?: SubTree<TTree1>) => SubTree<TTree2>[]) | undefined;
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

export function copy<TTree extends Tree>(root: TTree): TTree {
    return convert(root, {}) as TTree;
}

export function condense<TTree extends Tree>(root: TTree): TTree {
    const result = copy(root);
    dfs<TTree>(result, (node, parent) => {
        const newChildren: SubTree<TTree>[] = [];
        for (const child of node.children ?? []) {
            const twin = newChildren.find(sibling => sibling.kind === child.kind && deepEqual(sibling.params, child.params));
            if (twin) {
                (twin.children ??= []).push(...child.children ?? [])
            } else {
                newChildren.push(child as SubTree<TTree>);
            }
        }
        node.children = newChildren;
    });
    return result;
}
