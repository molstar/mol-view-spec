/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { AnnotationColorThemeProvider } from './color';
import { AnnotationsProvider } from './prop';
import { AnnotationTooltipsLabelProvider, AnnotationTooltipsProvider } from './tooltips-prop';
import { AnnotationLabelRepresentationProvider } from './label-representation';


/** Registers color theme "Annotation", related custom model property, and loci labels */
export const Annotation = PluginBehavior.create<{ autoAttach: boolean }>({
    name: 'annotation-prop',
    category: 'custom-props',
    display: {
        name: 'Annotation',
        description: 'Custom annotation data'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean }> {
        register(): void {
            this.ctx.customModelProperties.register(AnnotationsProvider, this.params.autoAttach);
            this.ctx.customStructureProperties.register(AnnotationTooltipsProvider, this.params.autoAttach);
            this.ctx.managers.lociLabels.addProvider(AnnotationTooltipsLabelProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(AnnotationColorThemeProvider);
            this.ctx.representation.structure.registry.add(AnnotationLabelRepresentationProvider);
        }
        update(p: { autoAttach: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            this.ctx.customModelProperties.setDefaultAutoAttach(AnnotationsProvider.descriptor.name, this.params.autoAttach);
            return updated;
        }
        unregister() {
            this.ctx.customModelProperties.unregister(AnnotationsProvider.descriptor.name);
            this.ctx.customStructureProperties.unregister(AnnotationTooltipsProvider.descriptor.name);
            this.ctx.managers.lociLabels.removeProvider(AnnotationTooltipsLabelProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(AnnotationColorThemeProvider);
            this.ctx.representation.structure.registry.remove(AnnotationLabelRepresentationProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
    })
});
