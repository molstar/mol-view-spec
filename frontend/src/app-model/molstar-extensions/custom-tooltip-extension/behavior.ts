/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { CustomTooltipsProvider, CustomTooltipsLabelProvider } from './tooltips-prop';


/** Registers "Custom Tooltips" custom structure property */
export const CustomTooltips = PluginBehavior.create<{ autoAttach: boolean }>({
    name: 'custom-tooltip',
    category: 'custom-props',
    display: {
        name: 'Custom tooltips',
        description: 'Custom tooltips'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean }> {
        register(): void {
            this.ctx.customStructureProperties.register(CustomTooltipsProvider, this.params.autoAttach);
            this.ctx.managers.lociLabels.addProvider(CustomTooltipsLabelProvider);
        }
        unregister() {
            this.ctx.customStructureProperties.unregister(CustomTooltipsProvider.descriptor.name);
            this.ctx.managers.lociLabels.removeProvider(CustomTooltipsLabelProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
    })
});
