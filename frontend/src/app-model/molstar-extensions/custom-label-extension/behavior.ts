/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { CustomLabelRepresentationProvider } from './representation';


/** Registers structure representation type "Custom Label" */
export const CustomLabel = PluginBehavior.create<{ autoAttach: boolean }>({
    name: 'custom-label',
    category: 'representation',
    display: {
        name: 'Custom label',
        description: 'Custom label representation'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean }> {
        register(): void {
            this.ctx.representation.structure.registry.add(CustomLabelRepresentationProvider);
        }
        update(p: { autoAttach: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            return updated;
        }
        unregister() {
            this.ctx.representation.structure.registry.remove(CustomLabelRepresentationProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
    })
});
