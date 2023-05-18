import { Node, NodeTypes } from './general-nodes';


function _dfs<TTree extends NodeTypes>(root: Node<TTree>, parent: Node<TTree> | undefined, visit?: (node: Node<TTree>, parent?: Node<TTree>) => any, postVisit?: (node: Node<TTree>, parent?: Node<TTree>) => any) {
    if (visit) visit(root, parent);
    for (const child of root.children ?? []) {
        _dfs(child as Node<TTree>, root, visit, postVisit);
    }
    if (postVisit) postVisit(root, parent);
}

export function dfs<TTree extends NodeTypes>(root: Node<TTree>, visit?: (node: Node<TTree>, parent?: Node<TTree>) => any, postVisit?: (node: Node<TTree>, parent?: Node<TTree>) => any) {
    return _dfs(root, undefined, visit, postVisit)
}

export function prettyString<TTree extends NodeTypes>(node: Node<TTree>) {
    let level = 0;
    const lines: string[] = [];
    dfs(node, node => lines.push('   '.repeat(level++) + `- ${node.kind} ${formatObject(node.params ?? {})}`), node => level--);
    return lines.join('\n');
}

function formatObject(obj: {}) {
    return JSON.stringify(obj).replace(/,("\w+":)/g, ', $1').replace(/"(\w+)":/g, '$1: ');
}


/** Return an object with keys `keys` and their values same as in `obj` */
export function pickObjectKeys<T extends {}, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result: Partial<Pick<T, K>> = {};
    for (const key of keys) {
        result[key] = obj[key];
    }
    return result as Pick<T, K>;
}

/** Return an object same as `obj` but without keys `keys` */
export function omitObjectKeys<T extends {}, K extends keyof T>(obj: T, omitKeys: K[]): Omit<T, K> {
    const result: T = { ...obj };
    for (const key of omitKeys) {
        delete result[key];
    }
    return result as Omit<T, K>;
}
