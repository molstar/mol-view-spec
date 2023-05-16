import { Node } from './nodes';

export function dfs(root: Node, visit: (node: Node, parent?: Node) => any, parent?: Node) {
    visit(root, parent);
    for (const child of root.children ?? []) {
        dfs(child as Node, visit, root);
    }
}

