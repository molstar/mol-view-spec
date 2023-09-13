/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';

import { makeMultilayerColorThemeProvider } from './color';


/** Registers color theme "Multilayer" */
export const MultilayerColorTheme = PluginBehavior.create<{}>({
    name: 'multilayer-color-theme',
    category: 'misc',
    display: {
        name: 'Multilayer Color Theme',
        description: 'Multilayer Color Theme'
    },
    ctor: class extends PluginBehavior.Handler<{}> {
        private readonly provider = makeMultilayerColorThemeProvider(this.ctx.representation.structure.themes.colorThemeRegistry);

        register(): void {
            this.ctx.representation.structure.themes.colorThemeRegistry.add(this.provider);
        }
        unregister() {
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(this.provider);
        }
    },
    params: () => ({})
});
