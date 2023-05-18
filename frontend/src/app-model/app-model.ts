import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import * as GeneralTree from './view-spec/nodes-generic';
import { dfs, omitObjectKeys, pickObjectKeys, prettyString } from './view-spec/utils';
import { Download } from 'molstar/lib/mol-plugin-state/transforms/data';
import { condense, convert } from './view-spec/node-conversions';
import { copyNodeWithoutChildren } from './view-spec/nodes-generic';
import { MVSTree } from './view-spec/nodes-mvs';
import { StateObjectSelector } from 'molstar/lib/mol-state';
import { IntermediateNode, IntermediateTree1, MolstarTree } from './view-spec/nodes-molstar';


/** This is because although `url` is required, `params` in general are optional */
const DEFAULT_URL = 'DEFAULT_URL';

export class AppModel {
    plugin?: PluginUIContext;

    async initPlugin(target: HTMLDivElement) {
        const defaultSpec = DefaultPluginUISpec();
        this.plugin = await createPluginUI(target, {
            ...defaultSpec,
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: true,  // original: false
                    controlsDisplay: 'landscape',  // original: not given
                },
            },
            components: {
                // controls: { left: 'none', right: 'none', top: 'none', bottom: 'none' },
                controls: { right: 'none', top: 'none', bottom: 'none' },
            },
            canvas3d: {
                camera: {
                    helper: { axes: { name: 'off', params: {} } }
                }
            },
            config: [
                [PluginConfig.Viewport.ShowExpand, true],  // original: false
                [PluginConfig.Viewport.ShowControls, true],  // original: false
                [PluginConfig.Viewport.ShowSelectionMode, false],
                [PluginConfig.Viewport.ShowAnimation, false],
            ],
        });
    }

    public async foo() {
        console.log('foo', this.plugin);
        if (!this.plugin) return;
        this.plugin.behaviors.layout.leftPanelTabName.next('data');
        await this.plugin.build().toRoot().apply(Download, { isBinary: true, url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn.bcif' }).commit();

        const exampleUrl = 'http://localhost:9000/api/v1/examples/load/1tqn';
        const response = await fetch(exampleUrl);
        const data = await response.json() as GeneralTree.NodeOfKind<MVSTree, 'root'>;
        if (data.kind !== 'root') throw new Error('FormatError');
        console.log(data);
        const update = this.plugin.build();
        const m = new Map<MVSTree, any>();
        dfs<MVSTree>(data, (node, parent) => {
            // console.log('Visit', node, '<-', parent);
            if (node.kind === 'root') {
                const msRoot = update.toRoot().selector;
                update.delete(msRoot);
                m.set(node, msRoot);
            } else {
                if (!parent) throw new Error('FormatError');;
                const msTarget = m.get(parent);
                let msNode;
                switch (node.kind) {
                    // case 'download':
                    //     node.url;
                }
                // update.to(msTarget).apply(Download)
                m.set(node, parent);
            }
        });
        console.log(m);

        console.log(prettyString(TEST_DATA));

        // First stage of conversion: expand nodes
        const converted1 = convert<MVSTree, IntermediateTree1>(TEST_DATA, {
            'parse': node => [
                { kind: 'pre-parse', params: node.params && pickObjectKeys(node.params, ['is_binary']) },
                { kind: 'parse', params: node.params && omitObjectKeys(node.params, ['is_binary']) }
            ],
            'structure': node => [
                { kind: 'model', params: node.params && pickObjectKeys(node.params, ['model_index']) },
                { kind: 'structure', params: node.params && omitObjectKeys(node.params, ['model_index']) },
            ],
        });
        // console.log(converted1);
        // console.log(prettyString(converted1));

        // Second stage of conversion: collapse nodes
        const converted2 = convert<IntermediateTree1, MolstarTree>(converted1, {
            'download': node => [],
            'raw': node => [],
            'pre-parse': (node, parent) => parent?.kind === 'download' ? [
                { kind: 'download', params: { url: DEFAULT_URL, ...parent.params, ...node.params } },
            ] : parent?.kind === 'raw' ? [
                { kind: 'raw', params: { ...parent.params, ...node.params } },
            ] : [
                copyNodeWithoutChildren(node),
            ],
        });
        // console.log(converted2);
        // console.log(prettyString(converted2));

        // Third stage of conversion: condense nodes
        const converted3 = condense<MolstarTree>(converted2);
        console.log(prettyString(converted3));
    }
}

const TEST_DATA: GeneralTree.NodeOfKind<MVSTree, 'root'> = {
    "kind": "root",
    "children": [
        {
            "kind": "download", "params": { "url": "https://www.ebi.ac.uk/pdbe/entry-files/download/1cbs_updated.cif" },
            "children": [
                {
                    "kind": "parse", "params": { "format": "mmcif", "is_binary": false },
                    "children": [
                        {
                            "kind": "structure", "params": { "model_index": 1, "assembly_id": "1" },
                            "children": [
                                {
                                    "kind": "component", "params": { "selector": "protein" },
                                    "children": [
                                        {
                                            "kind": "representation", "params": { "type": "cartoon", "color": "white" },
                                            "children": [
                                                {
                                                    "kind": "color", "params": { "label_asym_id": "A", "label_seq_id": 64, "color": "red" }
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "kind": "component", "params": { "selector": "ligand" },
                                    "children": [
                                        {
                                            "kind": "representation", "params": { "type": "ball-and-stick" },
                                            "children": [
                                                {
                                                    "kind": "color-from-cif", "params": { "category_name": "my_custom_cif_category" }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        { "kind": "structure", "params": { "model_index": 1, "assembly_id": "2" } },
                        { "kind": "structure", "params": { "model_index": 2, "assembly_id": "1" } },
                        { "kind": "structure", "params": { "model_index": 2, "assembly_id": "2" } },
                        { "kind": "structure", "params": { "model_index": 2, "assembly_id": "3" } },
                        { "kind": "structure", "params": { "model_index": 3, "assembly_id": "1" } },
                        { "kind": "structure", "params": { "model_index": 3, "assembly_id": "2" } },
                        { "kind": "structure", "params": { "model_index": 3, "assembly_id": "3" } }
                    ]
                }
            ]
        },
        {
            "kind": "raw", "params": { "data": "hello" }, "children": [
                { "kind": "parse", "params": { "format": "pdb", "is_binary": false } },
                { "kind": "parse", "params": { "format": "mmcif", "is_binary": true } },
                { "kind": "parse", "params": { "format": "mmcif", "is_binary": false } }
            ]
        },
        {
            "kind": "raw", "params": { "data": "ciao" }
        }

    ]
};