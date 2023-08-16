import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { BehaviorSubject } from 'rxjs';

import { Annotation } from './cif-color-extension/behavior';
import { CustomLabel } from './custom-label-extension/behavior';
import { loadMVSTree } from './load-tree';
import { MVSTree } from './tree/mvs-nodes';
import { treeToString } from './tree/tree-utils';


export class AppModel {
    plugin?: PluginUIContext;
    status = new BehaviorSubject<'ready' | 'loading' | 'error'>('ready');
    url = new BehaviorSubject<string | undefined>(undefined);
    tree = new BehaviorSubject<string | undefined>(undefined);

    async initPlugin(target: HTMLDivElement) {
        const defaultSpec = DefaultPluginUISpec();
        defaultSpec.behaviors.push(PluginSpec.Behavior(Annotation));
        defaultSpec.behaviors.push(PluginSpec.Behavior(CustomLabel));
        this.plugin = await createPluginUI(target, {
            ...defaultSpec,
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: true, // original: false
                    controlsDisplay: 'landscape', // original: not given
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
                [PluginConfig.Viewport.ShowExpand, true], // original: false
                [PluginConfig.Viewport.ShowControls, true], // original: false
                [PluginConfig.Viewport.ShowSelectionMode, false],
                [PluginConfig.Viewport.ShowAnimation, false],
            ],
        });
    }

    public async loadMvsFromUrl(url: string = 'http://localhost:9000/api/v1/examples/load/1cbs') {
        this.status.next('loading');
        try {
            console.log('foo', this.plugin);
            if (!this.plugin) return;
            this.plugin.behaviors.layout.leftPanelTabName.next('data');

            const { version, root } = await getTreeFromUrl(url);
            console.log('MVS version:', version);

            const DELETE_PREVIOUS = true;
            await loadMVSTree(this.plugin, root, DELETE_PREVIOUS);

            this.url.next(url);
            this.tree.next(treeToString(root));
            this.status.next('ready');
        } catch (err) {
            this.status.next('error');
            throw err;
        }
    }
}

async function getTreeFromUrl(url: string): Promise<{ version: number, root: MVSTree }> {
    console.log(url);
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

const TEST_DATA: MVSTree = {
    'kind': 'root',
    'children': [
        {
            'kind': 'download', 'params': { 'url': 'https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn.bcif' },
            // 'kind': 'download', 'params': { 'url': 'https://www.ebi.ac.uk/pdbe/entry-files/download/pdb1tqn.ent' },
            'children': [
                {
                    'kind': 'parse', 'params': { 'format': 'bcif' },
                    // 'kind': 'parse', 'params': { 'format': 'pdb' },
                    'children': [
                        {
                            'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 0, 'assembly_id': '1' },
                            'children': [
                                {
                                    'kind': 'component', 'params': { 'selector': 'protein' },
                                    'children': [
                                        {
                                            'kind': 'representation', 'params': { 'type': 'cartoon', 'color': 'white' },
                                            'children': [
                                                {
                                                    'kind': 'color-from-inline', 'params': { 'schema': 'residue', 'label_asym_id': 'A', 'label_seq_id': 64, 'color': 'red' }
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    'kind': 'component', 'params': { 'selector': 'ligand' },
                                    'children': [
                                        {
                                            'kind': 'representation', 'params': { 'type': 'ball-and-stick' },
                                            'children': [
                                                {
                                                    'kind': 'color-from-cif', 'params': { 'schema': 'residue', 'category_name': 'my_custom_cif_category' }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        { 'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 0, 'assembly_id': '2' } },
                        { 'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 1, 'assembly_id': '1' } },
                        { 'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 1, 'assembly_id': '2' } },
                        { 'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 1, 'assembly_id': '3' } },
                        { 'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 2, 'assembly_id': '1' } },
                        { 'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 2, 'assembly_id': '2' } },
                        { 'kind': 'structure', 'params': { 'kind': 'assembly', 'model_index': 2, 'assembly_id': '3' } },
                        { 'kind': 'structure', 'params': { 'kind': 'model', 'model_index': 2 } }
                    ]
                }
            ]
        },
        {
            'kind': 'raw', 'params': { 'data': 'hello' }, 'children': [
                { 'kind': 'parse', 'params': { 'format': 'pdb' } },
                { 'kind': 'parse', 'params': { 'format': 'bcif' } },
                { 'kind': 'parse', 'params': { 'format': 'mmcif' } }
            ]
        },
        {
            'kind': 'raw', 'params': { 'data': 'ciao' }
        }

    ]
};
