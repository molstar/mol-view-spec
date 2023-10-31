/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { BehaviorSubject } from 'rxjs';

import { MolViewSpec } from './mvs-extension/behavior';
import { MVSData, loadMVS } from './mvs-extension/load';
import { MVSTree } from './mvs-extension/tree/mvs/mvs-tree';
import { treeToString } from './mvs-extension/tree/generic/tree-utils';


export class AppModel {
    plugin?: PluginUIContext;
    status = new BehaviorSubject<'ready' | 'loading' | 'error'>('ready');
    url = new BehaviorSubject<string | undefined>(undefined);
    tree = new BehaviorSubject<string | undefined>(undefined);

    async initPlugin(target: HTMLDivElement) {
        const defaultSpec = DefaultPluginUISpec();
        defaultSpec.behaviors.push(PluginSpec.Behavior(MolViewSpec));
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
                    // helper: { axes: { name: 'off', params: {} } }
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
            if (!this.plugin) return;
            this.plugin.behaviors.layout.leftPanelTabName.next('data');

            const tree = await getTreeFromUrl(url);

            const DELETE_PREVIOUS = true;
            await loadMVS(this.plugin, tree, DELETE_PREVIOUS);

            this.url.next(url);
            this.tree.next(treeToString(tree.root));
            this.status.next('ready');
        } catch (err) {
            this.status.next('error');
            throw err;
        }
    }
    public async loadMvs(tree: MVSData) {
        this.status.next('loading');
        try {
            if (!this.plugin) return;
            this.plugin.behaviors.layout.leftPanelTabName.next('data');

            const DELETE_PREVIOUS = true;
            await loadMVS(this.plugin, tree, DELETE_PREVIOUS);

            this.url.next('<inline>');
            this.tree.next(treeToString(tree.root));
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
