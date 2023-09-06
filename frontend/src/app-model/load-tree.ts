import { Mat3, Mat4, Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { CustomModelProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB, TransformStructureConformation } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { StateBuilder, StateObjectSelector } from 'molstar/lib/mol-state';
import { UUID } from 'molstar/lib/mol-util';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';

import { AnnotationColorThemeProps, decodeColor } from './cif-color-extension/color';
import { rowToExpression, rowsToExpression } from './cif-color-extension/helpers/selections';
import { AnnotationSpec } from './cif-color-extension/prop';
import { CustomLabelProps } from './custom-label-extension/representation';
import { Defaults } from './param-defaults';
import { SubTree, SubTreeOfKind, Tree, TreeSchema, getChildren, getParams, treeValidationIssues } from './tree/generic';
import { MolstarKind, MolstarNode, MolstarTree, MolstarTreeSchema } from './tree/molstar-nodes';
import { MVSTree, MVSTreeSchema } from './tree/mvs-nodes';
import { convertMvsToMolstar, dfs, treeToString } from './tree/tree-utils';
import { canonicalJsonString, formatObject, isDefined } from './utils';


// TODO once everything is implemented, remove `[]?:` and `undefined` return values
export type LoadingAction<TNode extends Tree, TContext> = (update: StateBuilder.Root, msTarget: StateObjectSelector, node: TNode, context: TContext) => StateObjectSelector | undefined


interface MolstarLoadingContext {
    /** Maps 'color-from-url' nodes to annotationId they should reference */
    annotationMap?: Map<MolstarNode<'color-from-url'>, string>,
    /** Maps each node (on 'structure' or lower level) than model to its nearest node with color information */
    nearestColorMap?: Map<MolstarNode, MolstarNode<'representation' | 'color' | 'color-from-url' | 'color-from-cif'>>,
}

export const MolstarLoadingActions: { [kind in MolstarKind]?: LoadingAction<MolstarNode<kind>, MolstarLoadingContext> } = {
    root(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'root'>, context: MolstarLoadingContext): StateObjectSelector {
        context.nearestColorMap = makeNearestColorMap(node);
        return msTarget;
    },
    download(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'download'>): StateObjectSelector {
        return update.to(msTarget).apply(Download, {
            url: getParams(node).url,
            isBinary: getParams(node).is_binary,
        }).selector;
    },
    parse(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'parse'>): StateObjectSelector | undefined {
        const format = getParams(node).format;
        if (format === 'cif') {
            return update.to(msTarget).apply(ParseCif, {}).selector;
        } else if (format === 'pdb') {
            return msTarget;
        } else {
            console.error(`Unknown format in "parse" node: "${format}"`);
            return undefined;
        }
    },
    trajectory(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'trajectory'>): StateObjectSelector | undefined {
        const format = getParams(node).format;
        if (format === 'cif') {
            return update.to(msTarget).apply(TrajectoryFromMmCif, {}).selector; // TODO apply block_header, block_index
        } else if (format === 'pdb') {
            return update.to(msTarget).apply(TrajectoryFromPDB, {}).selector;
        } else {
            console.error(`Unknown format in "trajectory" node: "${format}"`);
            return undefined;
        }
    },
    model(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'model'>, context: MolstarLoadingContext): StateObjectSelector {
        const distinctSpecs: { [key: string]: AnnotationSpec } = {};
        dfs(node, n => {
            if (n.kind === 'color-from-url') {
                const block: AnnotationSpec['cifBlock'] = isDefined(n.params.block_header) ?
                    { name: 'header', params: { header: n.params.block_header } }
                    : isDefined(n.params.block_index) ?
                        { name: 'index', params: { index: n.params.block_index ?? 0 } }
                        : { name: 'first', params: {} };
                const spec: Omit<AnnotationSpec, 'id'> = { url: n.params.url, format: n.params.format, schema: n.params.schema, cifBlock: block, cifCategory: n.params.category_name ?? undefined };
                const key = canonicalJsonString(spec as any);
                distinctSpecs[key] ??= { ...spec, id: UUID.create22() };
                (context.annotationMap ??= new Map()).set(n, distinctSpecs[key].id);
            }
        });
        const annotations = Object.values(distinctSpecs);
        console.log('annotationSources:', annotations);
        return update.to(msTarget)
            .apply(ModelFromTrajectory, {
                modelIndex: getParams(node).model_index ?? Defaults.structure.model_index,
            })
            .apply(CustomModelProperties, {
                properties: { annotations: { annotations: annotations } }
            }).selector;
    },
    structure(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'structure'>, context: MolstarLoadingContext): StateObjectSelector {
        const params = getParams(node);
        let result: StateObjectSelector;
        switch (params.kind) {
            case 'model':
                result = update.to(msTarget).apply(StructureFromModel, {
                    type: { name: 'model', params: {} },
                }).selector;
                break;
            case 'assembly':
                result = update.to(msTarget).apply(StructureFromModel, {
                    type: { name: 'assembly', params: { id: params.assembly_id } },
                }).selector;
                break;
            default:
                throw new Error(`NotImplementedError: Loading action for "structure" node, kind "${params.kind}"`);
        }
        // const assembly = params.assembly_id ?? Defaults.structure.assembly_id;
        // return update.to(msTarget).apply(StructureFromModel, {
        //     type: assembly
        //         ? { name: 'assembly', params: { id: assembly } }
        //         : { name: 'model', params: {} },
        // }).selector;
        // loadAllLabelsFromSubtree(update, result, node, context);
        return result;
    },
    component(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'component'>): StateObjectSelector {
        const selector = getParams(node).selector ?? Defaults.component.selector;
        if (typeof selector === 'string') {
            return update.to(msTarget).apply(StructureComponent, {
                type: { name: 'static', params: selector },
                label: selector,
            }).selector;
        } else {
            // TODO implement this using bundles? or not? I don't know
            const expression = Array.isArray(selector) ? rowsToExpression(selector) : rowToExpression(selector);
            return update.to(msTarget).apply(StructureComponent, {
                type: { name: 'expression', params: expression },
                nullIfEmpty: false,
                label: canonicalJsonString(selector),
            }).selector;
        }
        // TODO check with 'all' and other other selectors
    },
    representation(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'representation'>): StateObjectSelector {
        const mvsType = getParams(node).type;
        const type = (mvsType === 'surface') ? 'gaussian-surface' : mvsType;
        const typeParams = (type === 'ball-and-stick') ? { sizeFactor: 0.5, sizeAspectRatio: 0.5 } : {};
        const color = getParams(node).color ?? Defaults.representation.color;
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: type, params: typeParams },
            colorTheme: color ? { name: 'uniform', params: { value: Color(ColorNames[color as keyof ColorNames] ?? ColorNames.white) } } : undefined,
        }).selector;
    },
    'color-from-url'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'color-from-url'>, context: MolstarLoadingContext): StateObjectSelector {
        update.to(msTarget).update(old => ({
            ...old,
            colorTheme: {
                name: 'annotation',
                params: {
                    background: decodeColor(node.params.background),
                    annotationId: context.annotationMap?.get(node),
                } satisfies Partial<AnnotationColorThemeProps>
            }
        }));
        return msTarget;
    },
    label(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label'>, context: MolstarLoadingContext): StateObjectSelector {
        const item: CustomLabelProps['items'][number] = {
            text: node.params.text,
            position: { name: 'selection', params: {} },
        };
        const nearestColorNode = context.nearestColorMap?.get(node);
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: 'custom-label', params: { items: [item] } },
            colorTheme: colorThemeForColorNode(nearestColorNode, context),
        }).selector;
        return msTarget;
    },
    transforms(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'transforms'>, context: MolstarLoadingContext): StateObjectSelector {
        let result = msTarget;
        for (const transform of getChildren(node)) {
            if (transform.kind !== 'transform' || !transform.params) continue;
            const { rotation, translation } = transform.params;
            const matrix = transformFromRotationTranslation(rotation, translation);
            result = update.to(result).apply(TransformStructureConformation, { transform: { name: 'matrix', params: { data: matrix } } }).selector;
        }
        return result;
    },
    transform(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'transform'>, context: MolstarLoadingContext): StateObjectSelector {
        // do nothing, all transforms are applied in 'transforms' node
        return msTarget;
    },
};

/** Return a 4x4 matrix representing rotation + translation */
function transformFromRotationTranslation(rotation: number[] | null | undefined, translation: number[] | null | undefined): Mat4 {
    if (rotation && rotation.length !== 9) throw new Error(`'rotation' param for 'transform' node must be array of 9 elements, found ${rotation}`);
    if (translation && translation.length !== 3) throw new Error(`'translation' param for 'transform' node must be array of 3 elements, found ${translation}`);
    const T = Mat4.identity();
    if (rotation) {
        Mat4.fromMat3(T, Mat3.fromArray(Mat3(), rotation, 0));
    }
    if (translation) {
        Mat4.setTranslation(T, Vec3.fromArray(Vec3(), translation, 0));
    }
    if (!Mat4.isRotationAndTranslation(T)) throw new Error(`'rotation' param for 'transform' is not a valid rotation matrix: ${rotation}`);
    return T;
}

function colorThemeForColorNode(node: MolstarNode<'representation' | 'color' | 'color-from-cif' | 'color-from-url'> | undefined, context: MolstarLoadingContext) {
    let annotationId: string | undefined = undefined;
    let color: string | undefined = undefined;
    switch (node?.kind) {
        case 'color-from-url':
            annotationId = context.annotationMap?.get(node);
            color = node.params.background;
            break;
        case 'color-from-cif':
            console.error('Not implemented: label color from color-from-cif node');
            break;
        case 'color':
            color = node.params.color;
            break;
        case 'representation':
            color = node.params.color;
            break;
    }
    color ??= Defaults.representation.color;
    if (annotationId) {
        return {
            name: 'annotation',
            params: { background: decodeColor(color), annotationId: annotationId, } satisfies Partial<AnnotationColorThemeProps>
        };
    } else {
        return {
            name: 'uniform',
            params: { value: decodeColor(color) }
        };
    }
}
function makeNearestColorMap(root: MolstarTree) {
    const map = new Map<MolstarNode, MolstarNode<'representation' | 'color' | 'color-from-url' | 'color-from-cif'>>();
    dfs(root, undefined, (node, parent) => {
        if (!map.has(node)) {
            switch (node.kind) {
                case 'representation':
                case 'color':
                case 'color-from-url':
                case 'color-from-cif':
                    map.set(node, node);
            }
        }
        if (node.kind !== 'structure' && map.has(node) && parent && !map.has(parent)) {
            map.set(parent, map.get(node)!);
        }
    });
    dfs(root, (node, parent) => {
        if (parent && map.has(parent)) {
            map.set(node, map.get(parent)!);
        }
    });
    return map;
}
function loadAllLabelsFromSubtree(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'structure' | 'component'>, context: MolstarLoadingContext): StateObjectSelector | undefined {
    const items: Partial<CustomLabelProps>['items'] = [];
    for (const child of getChildren(node)) {
        if (child.kind === 'label') {
            const p = getParams(child);
            const item: CustomLabelProps['items'][number] = {
                text: p.text,
                // position: { name: 'selection', params: { ...pickObjectKeys(p, FieldsForSchemas[p.schema] as any[]) } }
                position: { name: 'selection', params: {} } // For now applying label on the whole structure, TODO create bundles for components
            };
            items.push(item);
        }
    }
    let annotationId: string | undefined = undefined;
    let color: string | undefined = undefined;
    dfs(node, n => {
        if (n.kind === 'color-from-url') {
            annotationId ??= context.annotationMap?.get(n);
            color ??= n.params.background;
        }
    });
    if (!color) {
        dfs(node, n => {
            if (n.kind === 'representation') color ??= n.params.color;
        });
    }
    const colorTheme = annotationId ? {
        name: 'annotation',
        params: {
            background: decodeColor(color ?? Defaults.representation.color),
            annotationId: annotationId,
        } satisfies Partial<AnnotationColorThemeProps>
    } : { name: 'uniform', params: { value: decodeColor(color ?? Defaults.representation.color) } };
    if (items.length > 0) {
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: 'custom-label', params: { items } },
            colorTheme: colorTheme,
        }).selector;
    } else {
        return undefined;
    }
}


export async function loadMolstarTree(plugin: PluginContext, tree: MolstarTree, deletePrevious: boolean) {
    const update = plugin.build();
    const mapping = new Map<SubTree<MolstarTree>, StateObjectSelector | undefined>(); // TODO remove undefined
    const context: MolstarLoadingContext = {};
    dfs(tree, (node, parent) => {
        console.log('Visit', node.kind, formatObject(getParams(node)));
        if (node.kind === 'root') {
            const msRoot = update.toRoot().selector;
            if (deletePrevious) {
                update.currentTree.children.get(msRoot.ref).forEach(child => update.delete(child));
            }
            const action = MolstarLoadingActions[node.kind] as LoadingAction<typeof node, MolstarLoadingContext> | undefined;
            const msNode = action?.(update, msRoot, node, context) ?? msRoot;
            mapping.set(node, msNode);
        } else {
            if (!parent) throw new Error(`FormatError: non-root node (${node.kind}) has no parent`);
            const msTarget = mapping.get(parent);
            if (!msTarget) {
                console.warn('No target found for this', node.kind);
                return;
            }
            const action = MolstarLoadingActions[node.kind] as LoadingAction<typeof node, MolstarLoadingContext> | undefined;
            if (action) {
                const msNode = action(update, msTarget, node, context);
                mapping.set(node, msNode);
            } else {
                console.warn('No action for node kind', node.kind);
            }
        }
    });
    // console.log(mapping);
    await update.commit();
}

export async function loadMVSTree(plugin: PluginContext, tree: MVSTree, deletePrevious: boolean) {
    console.log('MVS tree:');
    console.log(treeToString(tree));
    validateTree(MVSTreeSchema, tree, 'MVS');
    const molstarTree = convertMvsToMolstar(tree);
    console.log('Converted MolStar tree:');
    console.log(treeToString(molstarTree));
    validateTree(MolstarTreeSchema, molstarTree, 'Molstar');
    await loadMolstarTree(plugin, molstarTree, deletePrevious);
}

function validateTree(schema: TreeSchema, tree: Tree, label: string) {
    const issues = treeValidationIssues(schema, tree, { noExtra: true });
    if (issues) {
        console.error(label, 'validation issues:');
        for (const line of issues) {
            console.error(' ', line);
        }
        throw new Error('FormatError');
    } else {
        console.warn(label, '- no validation issues.');
    }
}
