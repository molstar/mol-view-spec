import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { CustomModelProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { StateBuilder, StateObjectSelector } from 'molstar/lib/mol-state';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';

import { Defaults } from './param-defaults';
import { SubTree, Tree, TreeSchema, getParams, treeValidationIssues } from './tree/generic';
import { MolstarKind, MolstarNode, MolstarTree, MolstarTreeSchema } from './tree/molstar-nodes';
import { MVSTree, MVSTreeSchema } from './tree/mvs-nodes';
import { convertMvsToMolstar, dfs, treeToString } from './tree/tree-utils';
import { formatObject } from './utils';
import { StateTreeSpine } from 'molstar/lib/mol-state/tree/spine';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { AnnotationsProps, AnnotationsSource, decodeColor } from './cif-color-extension/prop';
import { Source } from 'molstar/lib/extensions/volumes-and-segmentations/entry-root';
import { ParamDefinition } from 'molstar/lib/mol-util/param-definition';
import { AnnotationColorThemeParams, AnnotationFormat } from './cif-color-extension/color';


// TODO once everything is implemented, remove `[]?:` and `undefined` return values
export type LoadingAction<TNode extends Tree> = (update: StateBuilder.Root, msTarget: StateObjectSelector, node: TNode) => StateObjectSelector | undefined

export const LoadingActions: { [kind in MolstarKind]?: LoadingAction<MolstarNode<kind>> } = {
    download(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'download'>): StateObjectSelector {
        return update.to(msTarget).apply(Download, {
            url: getParams(node).url,
            isBinary: getParams(node).is_binary ?? Defaults.parse.is_binary,
        }).selector;
    },
    parse(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'parse'>): StateObjectSelector | undefined {
        const format = getParams(node).format;
        if (format === 'mmcif') {
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
        if (format === 'mmcif') {
            return update.to(msTarget).apply(TrajectoryFromMmCif, {}).selector; // TODO apply block_header, block_index
        } else if (format === 'pdb') {
            return update.to(msTarget).apply(TrajectoryFromPDB, {}).selector;
        } else {
            console.error(`Unknown format in "trajectory" node: "${format}"`);
            return undefined;
        }
    },
    model(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'model'>): StateObjectSelector {
        let annotationSources: AnnotationsSource[] = [];
        dfs<SubTree<MolstarTree>>(node, n => {
            if (n.kind === 'color-from-url') {
                annotationSources.push({ url: n.params.url, isBinary: n.params.is_binary ?? Defaults['color-from-url'].is_binary });
            }
        });
        annotationSources = distinctAnnotationSources(annotationSources);
        console.log('annotationSources:', annotationSources);
        return update.to(msTarget)
            .apply(ModelFromTrajectory, {
                modelIndex: getParams(node).model_index ?? Defaults.structure.model_index,
            })
            .apply(CustomModelProperties, {
                properties: { annotations: { annotationSources: annotationSources } }
            }).selector;
    },
    structure(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'structure'>): StateObjectSelector {
        const params = getParams(node);
        switch (params.kind) {
            case 'model':
                return update.to(msTarget).apply(StructureFromModel, {
                    type: { name: 'model', params: {} },
                }).selector;
            case 'assembly':
                return update.to(msTarget).apply(StructureFromModel, {
                    type: { name: 'assembly', params: { id: params.assembly_id } },
                }).selector;
            default:
                throw new Error(`NotImplementedError: Loading action for "structure" node, kind "${params.kind}"`);
        }
        // const assembly = params.assembly_id ?? Defaults.structure.assembly_id;
        // return update.to(msTarget).apply(StructureFromModel, {
        //     type: assembly
        //         ? { name: 'assembly', params: { id: assembly } }
        //         : { name: 'model', params: {} },
        // }).selector;
    },
    component(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'component'>): StateObjectSelector {
        const selector = getParams(node).selector ?? Defaults.component.selector;
        return update.to(msTarget).apply(StructureComponent, {
            type: { name: 'static', params: selector },
            label: selector,
        }).selector;
        // TODO check with 'all' and other other selectors
    },
    representation(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'representation'>): StateObjectSelector {
        const mvsType = getParams(node).type;
        const type = (mvsType === 'surface') ? 'gaussian-surface' : mvsType;
        const color = getParams(node).color ?? Defaults.representation.color;
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: type, params: {} },
            colorTheme: color ? { name: 'uniform', params: { value: Color(ColorNames[color as keyof ColorNames] ?? ColorNames.white) } } : undefined,
        }).selector;
    },
    'color-from-url'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'color-from-url'>): StateObjectSelector {
        const format: AnnotationFormat = (node.params.is_binary && node.params.format === 'cif') ? 'bcif' : node.params.format;
        const background = node.params.background ? decodeColor(node.params.background) : ParamDefinition.getDefaultValues(AnnotationColorThemeParams).background;
        update.to(msTarget).update(old => ({
            ...old,
            colorTheme: {
                name: 'annotation',
                params: {
                    background: background,
                    url: node.params.url,
                    format: format,
                }
            }
        }));
        return msTarget;
    },
};

/** Remove duplicates from annotation sources. Throw error if a single URL is listed twice with different formats. */
function distinctAnnotationSources(sources: AnnotationsSource[]) {
    const seen: { [url: string]: AnnotationsSource } = {};
    for (const source of sources) {
        const older = seen[source.url];
        if (older && older.isBinary !== source.isBinary) throw new Error('One annotation source cannot be both binary and string.');
        if (!older) seen[source.url] = source;
    }
    return Object.values(seen);
}

export async function loadMolstarTree(plugin: PluginContext, tree: MolstarTree, deletePrevious: boolean) {
    const update = plugin.build();
    const mapping = new Map<SubTree<MolstarTree>, StateObjectSelector | undefined>(); // TODO remove undefined
    dfs<MolstarTree>(tree, (node, parent) => {
        console.log('Visit', node.kind, formatObject(getParams(node)));
        if (node.kind === 'root') {
            const msRoot = update.toRoot().selector;
            if (deletePrevious) {
                update.currentTree.children.get(msRoot.ref).forEach(child => update.delete(child));
            }
            mapping.set(node, msRoot);
        } else {
            if (!parent) throw new Error(`FormatError: non-root node (${node.kind}) has no parent`);
            const msTarget = mapping.get(parent);
            if (!msTarget) {
                console.warn('No target found for this', node.kind);
                return;
            }
            const action = LoadingActions[node.kind] as LoadingAction<typeof node> | undefined;
            if (action) {
                const msNode = action(update, msTarget, node);
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
