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
import { canonicalJsonString } from './helpers/utils';
import { AnnotationFromSourceKind, AnnotationFromUriKind, LoadingActions, collectAnnotationReferences, collectAnnotationTooltips, collectInlineTooltips, colorThemeForNode, componentFromUrlOrCifProps, componentPropsFromSelector, isPhantomComponent, labelFromUrlOrCifProps, loadTree, makeNearestReprMap, representationProps, structureProps, transformFromRotationTranslation } from './load-helpers';
import { ParamsOfKind, SubTreeOfKind, getChildren, getParams, validateTree } from './tree/generic/generic';
import { convertMvsToMolstar } from './tree/mvs/conversion';
import { MolstarNode, MolstarTree, MolstarTreeSchema } from './tree/mvs/molstar-tree';
import { MVSTree, MVSTreeSchema } from './tree/mvs/mvs-tree';
import { Defaults } from './tree/mvs/param-defaults';


export interface MVSData {
    root: MVSTree,
    version: number,
}

export async function loadMVS(plugin: PluginContext, data: MVSData | string, deletePrevious: boolean) {
    if (typeof data === 'string') {
        data = JSON.parse(data) as MVSData;
    }
    // console.log(`MVS tree (v${data.version}):\n${treeToString(data.root)}`);
    validateTree(MVSTreeSchema, data.root, 'MVS');
    const molstarTree = convertMvsToMolstar(data.root);
    // console.log(`Converted MolStar tree:\n${treeToString(molstarTree)}`);
    validateTree(MolstarTreeSchema, molstarTree, 'Converted Molstar');
    await loadMolstarTree(plugin, molstarTree, deletePrevious);
}

async function loadMolstarTree(plugin: PluginContext, tree: MolstarTree, deletePrevious: boolean) {
    const context: MolstarLoadingContext = {};

    await loadTree(plugin, tree, MolstarLoadingActions, context, deletePrevious);

    setCanvas(plugin, context.canvas);
    if (context.focus?.kind === 'camera') {
        await focusCameraNode(plugin, context.focus.params);
    } else if (context.focus?.kind === 'focus') {
        await focusStructureNode(plugin, context.focus.focusTarget, context.focus.params);
    } else {
        await focusStructureNode(plugin, undefined, undefined);
    }
}


export interface MolstarLoadingContext {
    /** Maps `*_from_[url|cif]` nodes to annotationId they should reference */
    annotationMap?: Map<MolstarNode<AnnotationFromUriKind | AnnotationFromSourceKind>, string>,
    /** Maps each node (on 'structure' or lower level) to its nearest 'representation' node */
    nearestReprMap?: Map<MolstarNode, MolstarNode<'representation'>>,
    focus?: { kind: 'camera', params: ParamsOfKind<MolstarTree, 'camera'> } | { kind: 'focus', focusTarget: StateObjectSelector, params: ParamsOfKind<MolstarTree, 'focus'> },
    canvas?: ParamsOfKind<MolstarTree, 'canvas'>,
}


const MolstarLoadingActions: LoadingActions<MolstarTree, MolstarLoadingContext> = {
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
        return result;
    },
    tooltip: undefined, // No action needed, already loaded in `structure`
    tooltip_from_uri: undefined, // No action needed, already loaded in `structure`
    tooltip_from_source: undefined, // No action needed, already loaded in `structure`
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
    component_from_uri(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'component_from_uri'>, context: MolstarLoadingContext): StateObjectSelector | undefined {
        if (isPhantomComponent(node)) return undefined;
        const props = componentFromUrlOrCifProps(node, context);
        return update.to(msTarget).apply(AnnotationStructureComponent, props).selector;
    },
    component_from_source(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'component_from_source'>, context: MolstarLoadingContext): StateObjectSelector | undefined {
        if (isPhantomComponent(node)) return undefined;
        const props = componentFromUrlOrCifProps(node, context);
        return update.to(msTarget).apply(AnnotationStructureComponent, props).selector;
    },
    representation(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'representation'>, context: MolstarLoadingContext): StateObjectSelector {
        return update.to(msTarget).apply(StructureRepresentation3D, {
            ...representationProps(node.params),
            colorTheme: colorThemeForNode(node, context),
        }).selector;
    },
    color: undefined, // No action needed, already loaded in `structure`
    color_from_uri: undefined, // No action needed, already loaded in `structure`
    color_from_source: undefined, // No action needed, already loaded in `structure`
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
    label_from_uri(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label_from_uri'>, context: MolstarLoadingContext): StateObjectSelector {
        const props = labelFromUrlOrCifProps(node, context);
        return update.to(msTarget).apply(StructureRepresentation3D, props).selector;
    },
    label_from_source(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label_from_source'>, context: MolstarLoadingContext): StateObjectSelector {
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
