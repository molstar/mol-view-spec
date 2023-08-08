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
import { Color } from 'molstar/lib/mol-util/color';
import { TableLegend } from 'molstar/lib/mol-util/legend';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';

const ValidationColors = [
    Color.fromRgb(170, 170, 170), // not applicable
    Color.fromRgb(0, 255, 0), // 0 issues
    Color.fromRgb(255, 255, 0), // 1
    Color.fromRgb(255, 128, 0), // 2
    Color.fromRgb(255, 0, 0), // 3 or more
];

export const AnnotationFormat = new Choice({ json: 'json', cif: 'cif', bcif: 'bcif' }, 'json');
export type AnnotationFormat = Choice.Values<typeof AnnotationFormat>
export const AnnotationFormatTypes = { json: 'string', cif: 'string', bcif: 'binary' } satisfies { [format in AnnotationFormat]: 'string' | 'binary' };

export const AnnotationColorThemeParams = {
    background: PD.Color(ColorNames.gainsboro, { description: 'Color for elements without annotation' }),
    url: PD.Text('', { description: 'Annotation source URL' }),
    format: AnnotationFormat.PDSelect(undefined, { description: 'Format of the annotation source' }),
    // TODO move format to AnnotationsParams in prop
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
        // legend: TableLegend(ValidationColorTable)
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
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) => data.structure ? AnnotationsProvider.attach(ctx, data.structure.models[0], void 0, true) : Promise.resolve(),
        detach: (data) => data.structure && AnnotationsProvider.ref(data.structure.models[0], false)
    }
};
