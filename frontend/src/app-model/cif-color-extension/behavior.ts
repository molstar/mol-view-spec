/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { OrderedSet } from 'molstar/lib/mol-data/int';
import { AnnotationsProvider } from './prop';
import { AnnotationColorThemeProvider } from './color';
import { Loci } from 'molstar/lib/mol-model/loci';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';

export const Annotation = PluginBehavior.create<{ autoAttach: boolean, showTooltip: boolean }>({
    name: 'annotation-prop',
    category: 'custom-props',
    display: {
        name: 'Annotation',
        description: 'Custom annotation data'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showTooltip: boolean }> {

        private provider = AnnotationsProvider;

        private labelPDBeValidation = {
            label: (loci: Loci): string | undefined => {

                if (!this.params.showTooltip) return void 0;

                switch (loci.kind) {
                    case 'element-loci':
                        // const annots = AnnotationsProvider.get(loci.structure.models[0]).value;
                        // console.log('AnnotationColorTheme:', annots);
                        // const annot = annots?.[props.url];

                        if (loci.elements.length === 0) return void 0;
                        const e = loci.elements[0];
                        const u = e.unit;
                        if (!u.model.customProperties.hasReference(AnnotationsProvider.descriptor)) return void 0;

                        const se = StructureElement.Location.create(loci.structure, u, u.elements[OrderedSet.getAt(e.indices, 0)]);
                        // console.log('loci:', loci);
                        return `TODO label for ${loci}`;

                    default: return void 0;
                }
            }
        };

        register(): void {
            this.ctx.customModelProperties.register(this.provider, this.params.autoAttach);
            this.ctx.managers.lociLabels.addProvider(this.labelPDBeValidation);

            this.ctx.representation.structure.themes.colorThemeRegistry.add(AnnotationColorThemeProvider);
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
            this.ctx.managers.lociLabels.removeProvider(this.labelPDBeValidation);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(AnnotationColorThemeProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
        showTooltip: PD.Boolean(true)
    })
});
