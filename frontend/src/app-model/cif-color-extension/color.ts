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
import { Color } from 'molstar/lib/mol-util/color';


export const AnnotationColorThemeParams = {
    background: PD.Color(ColorNames.gainsboro, { description: 'Color for elements without annotation' }),
    url: PD.Text('', { description: 'Annotation source URL' }),
};

type AnnotationColorThemeParams = typeof AnnotationColorThemeParams


export function AnnotationColorTheme(ctx: ThemeDataContext, props: PD.Values<AnnotationColorThemeParams>): ColorTheme<AnnotationColorThemeParams> {
    let color: LocationColor = () => props.background;

    if (ctx.structure && !ctx.structure.isEmpty && ctx.structure.models[0].customProperties.has(AnnotationsProvider.descriptor)) {
        const annots = AnnotationsProvider.get(ctx.structure.models[0]).value;
        console.log('AnnotationColorTheme:', annots);
        const annot = annots?.[props.url];
        if (annot) {
            const colorForStructureElementLocation = (location: StructureElement.Location) => {
                // if (annot.getAnnotationForLocation(location)?.color !== annot.getAnnotationForLocation_Reference(location)?.color) throw new Error('AssertionError');
                const annotationRow = annot.getAnnotationForLocation(location);
                return decodeColor(annotationRow?.color) ?? props.background;
            };
            const auxLocation = StructureElement.Location.create(ctx.structure);

            color = (location: Location) => {
                if (StructureElement.Location.is(location)) {
                    return colorForStructureElementLocation(location);
                } else if (Bond.isLocation(location)) {
                    auxLocation.unit = location.aUnit;
                    auxLocation.element = location.aUnit.elements[location.aIndex];
                    return colorForStructureElementLocation(auxLocation);
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


export const AnnotationColorThemeProvider: ColorTheme.Provider<AnnotationColorThemeParams, 'annotation'> = {
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


export function decodeColor(colorString: string | undefined): Color | undefined {
    if (colorString === undefined) return undefined;
    let result = Color.fromHexStyle(colorString);
    if (result !== undefined && !isNaN(result)) return result;
    result = ColorNames[colorString.toLowerCase() as keyof typeof ColorNames];
    if (result !== undefined) return result;
    return undefined;
}
