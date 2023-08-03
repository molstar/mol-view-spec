/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { AnnotationsProvider } from './prop';
import { AnnotationColorThemeProvider } from './color';
import { Loci } from 'molstar/lib/mol-model/loci';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';
import { Color } from 'molstar/lib/mol-util/color';

export const Annotation = PluginBehavior.create<{ autoAttach: boolean, showTooltip: boolean }>({
    name: 'annotation-prop',
    category: 'custom-props',
    display: {
        name: 'Annotation',
        description: 'Custom annotation data'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showTooltip: boolean }> {

        private provider = AnnotationsProvider;

        private annotationColorLabelProvider = {
            label: (loci: Loci): string | undefined => {

                if (!this.params.showTooltip) return undefined;

                switch (loci.kind) {
                    case 'element-loci':
                        const location = StructureElement.Loci.getFirstLocation(loci);
                        if (!location) return undefined;
                        const annots = AnnotationsProvider.get(loci.structure.model).value;
                        console.log('annots:', annots);
                        let color: Color | undefined = undefined;
                        for (const sourceUrl in annots) {
                            const annot = annots[sourceUrl];
                            console.log('annot:', annot);
                            color = annot.colorForLocation(location);
                            // TODO create index
                        }
                        return color ? `Color: ${Color.toHexStyle(color)}` : undefined;
                    default: return undefined;
                }
            }
        };

        register(): void {
            this.ctx.customModelProperties.register(this.provider, this.params.autoAttach);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(AnnotationColorThemeProvider);
            this.ctx.managers.lociLabels.addProvider(this.annotationColorLabelProvider);
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
            this.ctx.managers.lociLabels.removeProvider(this.annotationColorLabelProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(AnnotationColorThemeProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
        showTooltip: PD.Boolean(true)
    })
});
