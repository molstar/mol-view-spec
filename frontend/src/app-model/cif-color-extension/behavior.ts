/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Loci } from 'molstar/lib/mol-model/loci';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { AnnotationColorThemeProvider } from './color';
import { AnnotationsProvider } from './prop';


export const Annotation = PluginBehavior.create<{ autoAttach: boolean, showTooltip: boolean }>({
    name: 'annotation-prop',
    category: 'custom-props',
    display: {
        name: 'Annotation',
        description: 'Custom annotation data'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showTooltip: boolean }> {
        private provider = AnnotationsProvider;

        private labelProvider = {
            label: (loci: Loci): string | undefined => {
                if (!this.params.showTooltip) return undefined;
                switch (loci.kind) {
                    case 'element-loci':
                        const location = StructureElement.Loci.getFirstLocation(loci);
                        if (!location) return undefined;
                        const annots = AnnotationsProvider.get(location.unit.model).value;
                        const tooltips: string[] = [];
                        for (const sourceUrl in annots) {
                            const annot = annots[sourceUrl];
                            const tooltip = annot.tooltipForLocation(location);
                            if (tooltip) {
                                tooltips.push(tooltip);
                            }
                        }
                        return (tooltips.length > 0) ? tooltips.join('\n') : undefined;
                    default: return undefined;
                }
            }
        };

        register(): void {
            this.ctx.customModelProperties.register(this.provider, this.params.autoAttach);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(AnnotationColorThemeProvider);
            this.ctx.managers.lociLabels.addProvider(this.labelProvider);
        }

        update(p: { autoAttach: boolean, showTooltip: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            this.params.showTooltip = p.showTooltip;
            this.ctx.customModelProperties.setDefaultAutoAttach(this.provider.descriptor.name, this.params.autoAttach);
            return updated;
        }

        unregister() {
            this.ctx.customModelProperties.unregister(AnnotationsProvider.descriptor.name);
            this.ctx.managers.lociLabels.removeProvider(this.labelProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(AnnotationColorThemeProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
        showTooltip: PD.Boolean(true)
    })
});
