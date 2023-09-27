/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Location } from 'molstar/lib/mol-model/location';
import { Bond, StructureElement } from 'molstar/lib/mol-model/structure';
import { ColorTheme, LocationColor } from 'molstar/lib/mol-theme/color';
import { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { getAnnotationForStructure } from './prop';


/** Parameter definition for color theme "Annotation" */
export const AnnotationColorThemeParams = {
    annotationId: PD.Text('', { description: 'Reference to "Annotation" custom model property' }),
    fieldName: PD.Text('color', { description: 'Annotation field (column) from which to take color values' }),
    background: PD.Color(ColorNames.gainsboro, { description: 'Color for elements without annotation' }),
};
export type AnnotationColorThemeParams = typeof AnnotationColorThemeParams

/** Parameter values for color theme "Annotation" */
export type AnnotationColorThemeProps = PD.Values<AnnotationColorThemeParams>


/** Return color theme that assigns colors based on an annotation file.
 * The annotation file itself is handled by a custom model property (`AnnotationsProvider`),
 * the color theme then just uses this property. */
export function AnnotationColorTheme(ctx: ThemeDataContext, props: AnnotationColorThemeProps): ColorTheme<AnnotationColorThemeParams> {
    let color: LocationColor = () => props.background;

    if (ctx.structure && !ctx.structure.isEmpty) {
        const { annotation } = getAnnotationForStructure(ctx.structure, props.annotationId);
        if (annotation) {
            const colorForStructureElementLocation = (location: StructureElement.Location) => {
                // if (annot.getAnnotationForLocation(location)?.color !== annot.getAnnotationForLocation_Reference(location)?.color) throw new Error('AssertionError');
                return decodeColor(annotation?.getValueForLocation(location, props.fieldName)) ?? props.background;
            };
            const auxLocation = StructureElement.Location.create(ctx.structure);

            color = (location: Location) => {
                if (StructureElement.Location.is(location)) {
                    return colorForStructureElementLocation(location);
                } else if (Bond.isLocation(location)) {
                    // this will be applied for each bond twice, to get color of each half (a* refers to the adjacent atom, b* to the opposite atom)
                    auxLocation.unit = location.aUnit;
                    auxLocation.element = location.aUnit.elements[location.aIndex];
                    return colorForStructureElementLocation(auxLocation);
                }
                return props.background;
            };
        } else {
            console.error(`Annotation source "${props.annotationId}" not present`);
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


/** A thingy that is needed to register color theme "Annotation" */
export const AnnotationColorThemeProvider: ColorTheme.Provider<AnnotationColorThemeParams, 'annotation'> = {
    name: 'annotation',
    label: 'Annotation',
    category: ColorTheme.Category.Misc,
    factory: AnnotationColorTheme,
    getParams: ctx => AnnotationColorThemeParams,
    defaultValues: PD.getDefaultValues(AnnotationColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) => true,
};


/** Convert `colorString` (either color name like 'magenta' or hex code like '#ff00ff') to Color.
 * Return `undefined` if `colorString` cannot be converted. */
export function decodeColor(colorString: string | undefined): Color | undefined {
    if (colorString === undefined) return undefined;
    let result = Color.fromHexStyle(colorString);
    if (result !== undefined && !isNaN(result)) return result;
    result = ColorNames[colorString.toLowerCase() as keyof typeof ColorNames];
    if (result !== undefined) return result;
    return undefined;
}
