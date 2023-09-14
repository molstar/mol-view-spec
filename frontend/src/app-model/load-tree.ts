/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Mat3, Mat4, Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { CustomModelProperties, CustomStructureProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB, TransformStructureConformation } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { StateBuilder, StateObjectSelector } from 'molstar/lib/mol-state';


import { AnnotationColorThemeProps, decodeColor } from './molstar-extensions/color-from-url-extension/color';
import { AnnotationSpec } from './molstar-extensions/color-from-url-extension/prop';
import { AnnotationTooltipsProps } from './molstar-extensions/color-from-url-extension/tooltips-prop';
import { CustomLabelProps } from './molstar-extensions/custom-label-extension/representation';
import { rowToExpression, rowsToExpression } from './molstar-extensions/helpers/selections';
import { MultilayerColorThemeProps, NoColor, Selector, SelectorAll } from './molstar-extensions/multilayer-color-theme-extension/color';
import { DefaultColor, Defaults } from './param-defaults';
import { ParamsOfKind, SubTree, SubTreeOfKind, Tree, TreeSchema, getChildren, getParams, treeValidationIssues } from './tree/generic';
import { MolstarKind, MolstarNode, MolstarTree, MolstarTreeSchema } from './tree/molstar-nodes';
import { MVSTree, MVSTreeSchema } from './tree/mvs-nodes';
import { convertMvsToMolstar, dfs, treeToString } from './tree/tree-utils';
import { canonicalJsonString, distinct, formatObject, isDefined, stringHash } from './utils';
import { focusCameraNode, focusStructureNode } from './focus';


// TODO once everything is implemented, remove `[]?:` and `undefined` return values
export type LoadingAction<TNode extends Tree, TContext> = (update: StateBuilder.Root, msTarget: StateObjectSelector, node: TNode, context: TContext) => StateObjectSelector | undefined


interface MolstarLoadingContext {
    /** Maps 'color-from-url' nodes to annotationId they should reference */
    annotationMap?: Map<MolstarNode<'color-from-url' | 'color-from-cif' | 'tooltip-from-url' | 'tooltip-from-cif' | 'label-from-url' | 'label-from-cif'>, string>,
    /** Maps each node (on 'structure' or lower level) than model to its nearest node with color information */
    nearestColorMap?: Map<MolstarNode, MolstarNode<'color' | 'color-from-url' | 'color-from-cif'>>,
    focus?: { camera?: ParamsOfKind<MolstarTree, 'camera'>, focusTarget?: StateObjectSelector }
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
        const annotations = collectAnnotationReferences(node, context);
        return update.to(msTarget)
            .apply(ModelFromTrajectory, {
                modelIndex: getParams(node).model_index ?? Defaults.structure.model_index,
            })
            .apply(CustomModelProperties, {
                properties: { annotations: { annotations: annotations } }
            }).selector;
    },
    structure(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'structure'>, context: MolstarLoadingContext): StateObjectSelector {
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
        let tooltips: AnnotationTooltipsProps['tooltips'] = [];
        dfs(node, n => {
            if (n.kind === 'tooltip-from-url') {
                const annotationId = context.annotationMap?.get(n);
                if (annotationId) {
                    tooltips.push({ annotationId, fieldName: n.params.field_name ?? Defaults['tooltip-from-url'].field_name });
                };
            }
        });
        tooltips = distinct(tooltips);
        update.to(result).apply(CustomStructureProperties, {
            properties: { 'annotation-tooltips': { tooltips } }
        });
        // loadAllLabelsFromSubtree(update, result, node, context);
        return result;
    },
    component(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'component'>): StateObjectSelector {
        const selector = getParams(node).selector ?? Defaults.component.selector;
        return update.to(msTarget).apply(StructureComponent, {
            type: componentPropsFromSelector(selector),
            label: canonicalJsonString(selector),
            nullIfEmpty: false,
        }).selector;
    },
    representation(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'representation'>): StateObjectSelector {
        const mvsType = getParams(node).type;
        const type = (mvsType === 'surface') ? 'gaussian-surface' : mvsType;
        const typeParams = (type === 'ball-and-stick') ? { sizeFactor: 0.5, sizeAspectRatio: 0.5 } : {};
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: type, params: typeParams },
        }).selector;
    },
    colors(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'colors'>, context: MolstarLoadingContext): StateObjectSelector {
        const children = getChildren(node).filter(c => c.kind === 'color' || c.kind === 'color-from-cif' || c.kind === 'color-from-url') as MolstarNode<'color' | 'color-from-cif' | 'color-from-url'>[];
        if (children.length === 1) {
            update.to(msTarget).update(old => ({
                ...old,
                colorTheme: colorThemeForColorNode(children[0], context),
            }));
        } else {
            const layers: MultilayerColorThemeProps['layers'] = children.map(
                c => ({ theme: colorThemeForColorNode(c, context), selection: componentPropsFromSelector(c.kind === 'color' ? c.params.selector : undefined) })
            );
            update.to(msTarget).update(old => ({
                ...old,
                colorTheme: {
                    name: 'multilayer',
                    params: {
                        layers,
                    }
                },
            }));
        }
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
    },
    'label-from-url'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label-from-url'>, context: MolstarLoadingContext): StateObjectSelector {
        const annotationId = context.annotationMap?.get(node);
        const fieldName = node.params.field_name ?? Defaults[node.kind].field_name;
        const nearestColorNode = context.nearestColorMap?.get(node);
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: 'annotation-label', params: { annotationId, fieldName } },
            colorTheme: colorThemeForColorNode(nearestColorNode, context),
        }).selector;
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
    focus(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'focus'>, context: MolstarLoadingContext): StateObjectSelector {
        (context.focus ??= {}).focusTarget = msTarget; // keep other params
        return msTarget;
    },
    camera(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'camera'>, context: MolstarLoadingContext): StateObjectSelector {
        context.focus = { camera: { ...node.params }, focusTarget: undefined };
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

/** Collect distinct annotation specs from all nodes in `tree` and set context.annotationMap[node] to respective annotationIds */
function collectAnnotationReferences(tree: SubTree<MolstarTree>, context: MolstarLoadingContext): AnnotationSpec[] {
    const distinctSpecs: { [key: string]: AnnotationSpec } = {};
    dfs(tree, node => {
        let spec: Omit<AnnotationSpec, 'id'> | undefined = undefined;
        switch (node.kind) {
            case 'color-from-url':
            case 'tooltip-from-url':
            case 'label-from-url':
                const p = node.params;
                spec = { source: { name: 'url', params: { url: p.url, format: p.format } }, schema: p.schema, cifBlock: blockSpec(p.block_header, p.block_index), cifCategory: p.category_name ?? undefined };
                break;
            case 'color-from-cif':
            case 'tooltip-from-cif':
            case 'label-from-cif':
                const q = node.params;
                spec = { source: { name: 'source-cif', params: {} }, schema: q.schema, cifBlock: blockSpec(q.block_header, q.block_index), cifCategory: q.category_name ?? undefined };
                break;
        }
        if (spec) {
            const key = canonicalJsonString(spec as any);
            distinctSpecs[key] ??= { ...spec, id: stringHash(key) };
            (context.annotationMap ??= new Map()).set(node, distinctSpecs[key].id);
        }
    });
    return Object.values(distinctSpecs);
}

function blockSpec(header: string | null | undefined, index: number | null | undefined): AnnotationSpec['cifBlock'] {
    if (isDefined(header)) {
        return { name: 'header', params: { header: header } };
    } else {
        return { name: 'index', params: { index: index ?? 0 } };
    }
}

function componentPropsFromSelector(selector?: ParamsOfKind<MolstarTree, 'component'>['selector']): Selector {
    if (selector === undefined) {
        return SelectorAll;
    } else if (typeof selector === 'string') {
        return { name: 'static', params: selector };
    } else if (Array.isArray(selector)) {
        return { name: 'expression', params: rowsToExpression(selector) };
    } else {
        return { name: 'expression', params: rowToExpression(selector) };
    }
}

function colorThemeForColorNode(node: MolstarNode<'color' | 'color-from-cif' | 'color-from-url'> | undefined, context: MolstarLoadingContext) {
    let annotationId: string | undefined = undefined;
    let fieldName: string | undefined = undefined;
    let color: string | undefined = undefined;
    switch (node?.kind) {
        case 'color-from-url':
        case 'color-from-cif':
            annotationId = context.annotationMap?.get(node);
            fieldName = node.params.field_name ?? Defaults[node.kind].field_name;
            break;
        case 'color':
            color = node.params.color;
            break;
    }
    if (annotationId) {
        return {
            name: 'annotation',
            params: { annotationId, fieldName, background: NoColor } satisfies Partial<AnnotationColorThemeProps>
        };
    } else {
        return {
            name: 'uniform',
            params: { value: decodeColor(color) }
        };
    }
}
function makeNearestColorMap(root: MolstarTree) {
    const map = new Map<MolstarNode, MolstarNode<'color' | 'color-from-url' | 'color-from-cif'>>();
    dfs(root, undefined, (node, parent) => {
        if (!map.has(node)) {
            switch (node.kind) {
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
    const color = DefaultColor;
    dfs(node, n => {
        if (n.kind === 'color-from-url') {
            annotationId ??= context.annotationMap?.get(n);
        }
    });
    const colorTheme = annotationId ? {
        name: 'annotation',
        params: {
            annotationId: annotationId,
        } satisfies Partial<AnnotationColorThemeProps>
    } : { name: 'uniform', params: { value: decodeColor(color) } };
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
    await update.commit();
    if (context.focus?.focusTarget) {
        await focusStructureNode(plugin, context.focus.focusTarget, context.focus.camera);
    } else if (context.focus?.camera) {
        await focusCameraNode(plugin, context.focus.camera);
    } else {
        await focusStructureNode(plugin, undefined, undefined);
    }
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
