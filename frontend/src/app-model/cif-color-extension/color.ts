/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { AnnotationsProvider } from './prop';
import { Location } from 'molstar/lib/mol-model/location';
import { Bond, StructureElement } from 'molstar/lib/mol-model/structure';
import { ColorTheme, LocationColor } from 'molstar/lib/mol-theme/color';
import { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { ColorNames } from 'molstar/lib/mol-util/color/names';


export const AnnotationColorThemeParams = {
    background: PD.Color(ColorNames.gainsboro, { description: 'Color for elements without annotation' }),
    url: PD.Text('', { description: 'Annotation source URL' }),
};

type Params = typeof AnnotationColorThemeParams

export function AnnotationColorTheme(ctx: ThemeDataContext, props: PD.Values<Params>): ColorTheme<Params> {
    let color: LocationColor = () => props.background;

    if (ctx.structure && !ctx.structure.isEmpty && ctx.structure.models[0].customProperties.has(AnnotationsProvider.descriptor)) {
        const annots = AnnotationsProvider.get(ctx.structure.models[0]).value;
        console.log('AnnotationColorTheme:', annots);
        const annot = annots?.[props.url];
        if (annot) {
            const auxLocation = StructureElement.Location.create(ctx.structure);

            // // DEBUG
            // console.time('TIME colorForLocation-all');
            // const h = ctx.structure.model.atomicHierarchy;
            // for (let iRes = 0; iRes < h.residueAtomSegments.count; iRes++) {
            //     auxLocation.unit = auxLocation.structure.units[0];
            //     auxLocation.element = h.residueAtomSegments.offsets[iRes];
            //     // annot.colorForLocation_Reference(auxLocation);
            //     annot.colorForLocation(auxLocation);
            // }
            // console.timeEnd('TIME colorForLocation-all');

            color = (location: Location) => {
                if (StructureElement.Location.is(location)) {
                    // if (annot.colorForLocation(location) !== annot.colorForLocation_Reference(location)) throw new Error('AssertionError');
                    return annot.colorForLocation(location) ?? props.background;
                } else if (Bond.isLocation(location)) {
                    auxLocation.unit = location.aUnit;
                    auxLocation.element = location.aUnit.elements[location.aIndex];
                    return annot.colorForLocation(auxLocation) ?? props.background;
                    // TODO is this sufficient?
                }
                return props.background;
            };
        } else {
            console.error(`Annotation source "${props.url}" not present`);
        }
    }

    return {
        factory: AnnotationColorTheme,
        granularity: 'group',
        preferSmoothing: true,
        color: color,
        props: props,
        description: 'Assigns colors based on custom annotation data.',
    };
}

export const AnnotationColorThemeProvider: ColorTheme.Provider<Params, 'annotation'> = {
    name: 'annotation',
    label: 'Annotation',
    category: ColorTheme.Category.Misc,
    factory: AnnotationColorTheme,
    getParams: ctx => AnnotationColorThemeParams,
    defaultValues: PD.getDefaultValues(AnnotationColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) => true,
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) => data.structure ? AnnotationsProvider.attach(ctx, data.structure.models[0], undefined, true) : Promise.resolve(),
        detach: (data) => data.structure && AnnotationsProvider.ref(data.structure.models[0], false),
    }
};
