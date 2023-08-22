import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { CustomModelProperties, ModelFromTrajectory, StructureComponent, StructureFromModel, TrajectoryFromMmCif, TrajectoryFromPDB } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { StateBuilder, StateObjectSelector } from 'molstar/lib/mol-state';
import { UUID } from 'molstar/lib/mol-util';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';

import { AnnotationColorThemeProps, decodeColor } from './cif-color-extension/color';
import { AnnotationSource, AnnotationSpec } from './cif-color-extension/prop';
import { Defaults } from './param-defaults';
import { SubTree, SubTreeOfKind, Tree, TreeSchema, getChildren, getParams, treeValidationIssues } from './tree/generic';
import { MolstarKind, MolstarNode, MolstarTree, MolstarTreeSchema } from './tree/molstar-nodes';
import { MVSTree, MVSTreeSchema } from './tree/mvs-nodes';
import { convertMvsToMolstar, dfs, treeToString } from './tree/tree-utils';
import { canonicalJsonString, formatObject } from './utils';
import { CustomLabelProps } from './custom-label-extension/representation';


// TODO once everything is implemented, remove `[]?:` and `undefined` return values
export type LoadingAction<TNode extends Tree, TContext> = (update: StateBuilder.Root, msTarget: StateObjectSelector, node: TNode, context: TContext) => StateObjectSelector | undefined


interface MolstarLoadingContext { annotationMap?: Map<MolstarNode<'color-from-url'>, string> }

export const MolstarLoadingActions: { [kind in MolstarKind]?: LoadingAction<MolstarNode<kind>, MolstarLoadingContext> } = {
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
    model(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'model'>, context: MolstarLoadingContext): StateObjectSelector {
        const distinctSpecs: { [key: string]: AnnotationSpec } = {};
        dfs<SubTree<MolstarTree>>(node, n => {
            if (n.kind === 'color-from-url') {
                const cifCategories: AnnotationSpec['cifCategories'] = n.params.category_name ?
                    {
                        name: 'selected',
                        params: {
                            list: [{ categoryName: n.params.category_name }]
                        }
                    }
                    : {
                        name: 'all',
                        params: {}
                    };
                const spec: Omit<AnnotationSpec, 'id'> = { url: n.params.url, format: n.params.format, schema: n.params.schema, cifCategories };
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
        loadLabelsFromInline(update, result, node, context);
        return result;
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
    'label'(update: StateBuilder.Root, msTarget: StateObjectSelector, node: MolstarNode<'label'>, context: MolstarLoadingContext): StateObjectSelector {
        // Do nothing (labels loaded as one node in `structure`)
        return msTarget;
        // const params = getParams(node);
        // const items: CustomLabelProps['items'] = [
        //     { text: params.text, position: { name: 'selection', params: { ...pickObjectKeys(params, FieldsForSchemas[params.schema] as any[]) } } }
        // ];
        // return update.to(msTarget).apply(StructureRepresentation3D, {
        //     type: { name: 'custom-label', params: { items } },
        //     colorTheme: { name: 'uniform', params: { value: ColorNames.white } }
        // }).selector;
    },
};

function loadLabelsFromInline(update: StateBuilder.Root, msTarget: StateObjectSelector, node: SubTreeOfKind<MolstarTree, 'structure' | 'component'>, context: MolstarLoadingContext): StateObjectSelector | undefined {
    const items: Partial<CustomLabelProps>['items'] = [];
    for (const child of getChildren(node as SubTree<MolstarTree>)) {
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
    dfs<SubTree<MolstarTree>>(node, n => {
        if (n.kind === 'color-from-url') {
            annotationId ??= context.annotationMap?.get(n);
            color ??= n.params.background;
        }
    });
    if (!color) {
        dfs<SubTree<MolstarTree>>(node, n => {
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


/** Remove duplicates from annotation sources. Throw error if a single URL is listed twice with different formats. */
function distinctAnnotationSources(sources: AnnotationSource[]) {
    const seen: { [url: string]: AnnotationSource } = {};
    for (const source of sources) {
        const older = seen[source.url];
        if (older && older.format !== source.format) throw new Error('One annotation source URL cannot be listed with different formats.');
        if (!older) seen[source.url] = source;
    }
    return Object.values(seen);
}

export async function loadMolstarTree(plugin: PluginContext, tree: MolstarTree, deletePrevious: boolean) {
    const update = plugin.build();
    const mapping = new Map<SubTree<MolstarTree>, StateObjectSelector | undefined>(); // TODO remove undefined
    const context: MolstarLoadingContext = {};
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
