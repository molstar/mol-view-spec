import { copyNodeWithoutChildren, Kind, Node, NodeTypes } from './general-nodes';
import { dfs } from './utils';

export function convert<TTree1 extends NodeTypes, TTree2 extends NodeTypes>(root: Node<TTree1>, conversions: { [kind in Kind<TTree1>]?: (node: Node<TTree1, kind>, parent?: Node<TTree1, any>) => Node<TTree2>[] }) {
    const mapping = new Map<Node<TTree1>, Node<TTree1> | Node<TTree2>>();
    let convertedRoot: Node<TTree1> | Node<TTree2>;
    dfs<TTree1>(root, (node, parent) => {
        const conversion = conversions[node.kind as keyof typeof conversions];
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