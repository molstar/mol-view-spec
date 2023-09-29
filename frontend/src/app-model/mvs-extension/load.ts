/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { CustomModelProperties, CustomStructureProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB, TransformStructureConformation } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { StateBuilder, StateObjectSelector } from 'molstar/lib/mol-state';

import { AnnotationsProvider } from './additions/annotation-prop';
import { AnnotationStructureComponent } from './additions/annotation-structure-component';
import { AnnotationTooltipsProvider } from './additions/annotation-tooltips-prop';
import { CustomLabelProps, CustomLabelRepresentationProvider } from './additions/custom-label/representation';
import { CustomTooltipsProvider } from './additions/custom-tooltips-prop';
import { focusCameraNode, focusStructureNode, setCanvas } from './camera';
import { AnnotationFromCifKind, AnnotationFromUrlKind, collectAnnotationReferences, collectAnnotationTooltips, collectInlineTooltips, colorThemeForNode, componentFromUrlOrCifProps, componentPropsFromSelector, isPhantomComponent, labelFromUrlOrCifProps, makeNearestReprMap, structureProps, transformFromRotationTranslation } from './load-helpers';
import { ParamsOfKind, SubTree, SubTreeOfKind, Tree, TreeSchema, getChildren, getParams, treeValidationIssues } from './tree/generic/generic';
import { dfs, treeToString } from './tree/generic/tree-utils';
import { convertMvsToMolstar } from './tree/mvs/conversion';
import { MolstarKind, MolstarNode, MolstarTree, MolstarTreeSchema } from './tree/mvs/molstar-tree';
import { MVSTree, MVSTreeSchema } from './tree/mvs/mvs-tree';
import { Defaults } from './tree/mvs/param-defaults';
import { canonicalJsonString, formatObject } from './utils';


// TODO once everything is implemented, remove `[]?:` and `undefined` return values
export type LoadingAction<TNode extends Tree, TContext> = (update: StateBuilder.Root, msTarget: StateObjectSelector, node: TNode, context: TContext) => StateObjectSelector | undefined

export interface MolstarLoadingContext {
    /** Maps `*-from-[url|cif]` nodes to annotationId they should reference */
    annotationMap?: Map<MolstarNode<AnnotationFromUrlKind | AnnotationFromCifKind>, string>,
    /** Maps each node (on 'structure' or lower level) to its nearest 'representation' node */
    nearestReprMap?: Map<MolstarNode, MolstarNode<'representation'>>,
    focus?: { kind: 'camera', params: ParamsOfKind<MolstarTree, 'camera'> } | { kind: 'focus', focusTarget: StateObjectSelector, params: ParamsOfKind<MolstarTree, 'focus'> },
    canvas?: ParamsOfKind<MolstarTree, 'canvas'>,
}


export const MolstarLoadingActions: { [kind in MolstarKind]?: LoadingAction<MolstarNode<kind>, MolstarLoadingContext> } = {
    root(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'root'>, context: MolstarLoadingContext): StateObjectSelector {
        context.nearestReprMap = makeNearestReprMap(node);
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
            return update.to(msTarget).apply(TrajectoryFromMmCif, {
                blockHeader: node.params.block_header ?? Defaults.structure.block_header ?? '', // Must set to '' because just undefined would get overwritten by createDefaults
                blockIndex: node.params.block_index ?? Defaults.structure.block_index ?? undefined,
            }).selector;
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
                properties: {
                    [AnnotationsProvider.descriptor.name]: { annotations }
                },
                autoAttach: [
                    AnnotationsProvider.descriptor.name
                ],
            }).selector;
    },
    structure(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'structure'>, context: MolstarLoadingContext): StateObjectSelector {
        const props = structureProps(node);
        const result = update.to(msTarget).apply(StructureFromModel, props).selector;
        const annotationTooltips = collectAnnotationTooltips(node, context);
        const inlineTooltips = collectInlineTooltips(node, context);
        if (annotationTooltips.length + inlineTooltips.length > 0) {
            update.to(result).apply(CustomStructureProperties, {
                properties: {
                    [AnnotationTooltipsProvider.descriptor.name]: { tooltips: annotationTooltips },
                    [CustomTooltipsProvider.descriptor.name]: { tooltips: inlineTooltips },
                },
                autoAttach: [
                    AnnotationTooltipsProvider.descriptor.name,
                    CustomTooltipsProvider.descriptor.name,
                ],
            });
        }
        // loadAllLabelsFromSubtree(update, result, node, context);
        return result;
    },
    tooltip() {
        return undefined; // No action needed, already loaded in `structure`
    },
    'tooltip-from-url'() {
        return undefined; // No action needed, already loaded in `structure`
    },
    'tooltip-from-cif'() {
        return undefined; // No action needed, already loaded in `structure`
    },
    component(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'component'>): StateObjectSelector | undefined {
        if (isPhantomComponent(node)) {
            return msTarget;
        }
        const selector = getParams(node).selector ?? Defaults.component.selector;
        return update.to(msTarget).apply(StructureComponent, {
            type: componentPropsFromSelector(selector),
            label: canonicalJsonString(selector),
            nullIfEmpty: false,
        }).selector;
    },
    'component-from-url'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'component-from-url'>, context: MolstarLoadingContext): StateObjectSelector | undefined {
        if (isPhantomComponent(node)) return undefined;
        const props = componentFromUrlOrCifProps(node, context);
        return update.to(msTarget).apply(AnnotationStructureComponent, props).selector;
    },
    'component-from-cif'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'component-from-cif'>, context: MolstarLoadingContext): StateObjectSelector | undefined {
        if (isPhantomComponent(node)) return undefined;
        const props = componentFromUrlOrCifProps(node, context);
        return update.to(msTarget).apply(AnnotationStructureComponent, props).selector;
    },
    representation(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'representation'>, context: MolstarLoadingContext): StateObjectSelector {
        const mvsType = getParams(node).type;
        const type = (mvsType === 'surface') ? 'gaussian-surface' : mvsType;
        const typeParams = (type === 'ball-and-stick') ? { sizeFactor: 0.5, sizeAspectRatio: 0.5 } : {};
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: type, params: typeParams },
            colorTheme: colorThemeForNode(node, context),
        }).selector;
    },
    color() {
        return undefined; // No action needed, already loaded in `representation`
    },
    'color-from-url'() {
        return undefined; // No action needed, already loaded in `representation`
    },
    'color-from-cif'() {
        return undefined; // No action needed, already loaded in `representation`
    },
    label(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label'>, context: MolstarLoadingContext): StateObjectSelector {
        const item: CustomLabelProps['items'][number] = {
            text: node.params.text,
            position: { name: 'selection', params: {} },
        };
        const nearestReprNode = context.nearestReprMap?.get(node);
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: {
                name: CustomLabelRepresentationProvider.name,
                params: { items: [item] } satisfies Partial<CustomLabelProps>
            },
            colorTheme: colorThemeForNode(nearestReprNode, context),
        }).selector;
    },
    'label-from-url'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label-from-url'>, context: MolstarLoadingContext): StateObjectSelector {
        const props = labelFromUrlOrCifProps(node, context);
        return update.to(msTarget).apply(StructureRepresentation3D, props).selector;
    },
    'label-from-cif'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label-from-cif'>, context: MolstarLoadingContext): StateObjectSelector {
        const props = labelFromUrlOrCifProps(node, context);
        return update.to(msTarget).apply(StructureRepresentation3D, props).selector;
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
    focus(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'focus'>, context: MolstarLoadingContext): StateObjectSelector {
        context.focus = { kind: 'focus', focusTarget: msTarget, params: getParams(node) };
        return msTarget;
    },
    camera(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'camera'>, context: MolstarLoadingContext): StateObjectSelector {
        context.focus = { kind: 'camera', params: getParams(node) };
        return msTarget;
    },
    canvas(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'canvas'>, context: MolstarLoadingContext): StateObjectSelector {
        context.canvas = getParams(node);
        return msTarget;
    },
};

// TODO define this generically?
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

    setCanvas(plugin, context.canvas);
    if (context.focus?.kind === 'camera') {
        await focusCameraNode(plugin, context.focus.params);
    } else if (context.focus?.kind === 'focus') {
        await focusStructureNode(plugin, context.focus.focusTarget, context.focus.params);
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
