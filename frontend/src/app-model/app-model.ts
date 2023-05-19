import { Download } from 'molstar/lib/mol-plugin-state/transforms/data';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';

import { SubTreeOfKind } from './tree/generic';
import { MVSTree } from './tree/mvs';
import { convertMvsToMolstar, dfs, treeToString } from './tree/tree-utils';


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
        const data = await response.json() as SubTreeOfKind<MVSTree, 'root'>;
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

        console.log('MVS tree:');
        console.log(treeToString(TEST_DATA));

        const converted = convertMvsToMolstar(TEST_DATA);
        console.log('Converted MolStar tree:');
        console.log(treeToString(converted));
    }
}

const TEST_DATA: SubTreeOfKind<MVSTree, 'root'> = {
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