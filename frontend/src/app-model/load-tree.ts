import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { StateBuilder, StateObjectSelector } from 'molstar/lib/mol-state';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';

import { Defaults } from './param-defaults';
import { Kind, SubTreeOfKind, Tree } from './tree/generic';
import * as MolstarNodes from './tree/molstar-nodes';
import { MVSTree, MolstarTree, convertMvsToMolstar, dfs, treeToString } from './tree/tree-utils';
import { formatObject } from './utils';


// TODO once everything is implemented, remove `[]?:` and `undefined` return values
export type LoadingAction<TNode extends Tree> = (update: StateBuilder.Root, msTarget: StateObjectSelector, node: TNode) => StateObjectSelector | undefined

export const LoadingActions: { [kind in Kind<MolstarTree>]?: LoadingAction<SubTreeOfKind<MolstarNodes.Any, kind>> } = {
    download(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNodes.Download): StateObjectSelector {
        return update.to(msTarget).apply(Download, {
            url: node.params?.url ?? Defaults.download.url,
            isBinary: node.params?.is_binary ?? Defaults.download.is_binary, // TODO here we should force MVS defaults, not rely on consumer-specific (MolStar) defaults
        }).selector;
    },
    parse(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNodes.Parse): StateObjectSelector | undefined {
        const format = node.params?.format ?? Defaults.parse.format;
        if (format === 'mmcif') {
            const cif = update.to(msTarget).apply(ParseCif, {}).selector;
            return update.to(cif).apply(TrajectoryFromMmCif, {}).selector;
        } else if (format === 'pdb') {
            return update.to(msTarget).apply(TrajectoryFromPDB, {}).selector;
        } else {
            return undefined;
        }
    },
    model(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNodes.Model): StateObjectSelector {
        return update.to(msTarget).apply(ModelFromTrajectory, {
            modelIndex: node.params?.model_index ?? Defaults.model.model_index,
        }).selector;
    },
    structure(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNodes.Structure): StateObjectSelector {
        const assembly = node.params?.assembly_id ?? Defaults.structure.assembly_id;
        return update.to(msTarget).apply(StructureFromModel, {
            type: assembly
                ? { name: 'assembly', params: { id: assembly } }
                : { name: 'model', params: {} },
        }).selector;
    },
    component(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNodes.Component): StateObjectSelector {
        const selector = node.params?.selector ?? Defaults.component.selector;
        return update.to(msTarget).apply(StructureComponent, {
            type: { name: 'static', params: selector },
            label: selector,
        }).selector;
        // TODO check with 'all' and other other selectors
    },
    representation(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNodes.Representation): StateObjectSelector {
        const type = node.params?.type ?? Defaults.representation.type;
        const color = node.params?.color ?? Defaults.representation.color;
        return update.to(msTarget).apply(StructureRepresentation3D, {
            type: { name: type, params: {} },
            colorTheme: color ? { name: 'uniform', params: { value: Color(ColorNames[color as keyof ColorNames] ?? ColorNames.white) } } : undefined,
        }).selector;
    },
};

export async function loadMolstarTree(plugin: PluginContext, tree: MolstarTree, deletePrevious: boolean) {
    const update = plugin.build();
    const mapping = new Map<MolstarTree, StateObjectSelector | undefined>(); // TODO remove undefined
    dfs<MolstarTree>(tree, (node, parent) => {
        console.log('Visit', node.kind, formatObject(node.params));
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
    console.log(mapping);
    await update.commit();
}

export async function loadMVSTree(plugin: PluginContext, tree: MVSTree, deletePrevious: boolean) {
    console.log('MVS tree:');
    console.log(treeToString(tree));
    const molstarTree = convertMvsToMolstar(tree);
    console.log('Converted MolStar tree:');
    console.log(treeToString(molstarTree));
    await loadMolstarTree(plugin, molstarTree, deletePrevious);
}
