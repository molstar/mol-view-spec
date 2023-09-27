/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Structure } from 'molstar/lib/mol-model/structure';
import { Representation, RepresentationContext, RepresentationParamsGetter } from 'molstar/lib/mol-repr/representation';
import { ComplexRepresentation, StructureRepresentation, StructureRepresentationProvider, StructureRepresentationStateBuilder } from 'molstar/lib/mol-repr/structure/representation';
import { ThemeRegistryContext } from 'molstar/lib/mol-theme/theme';
import { MarkerAction } from 'molstar/lib/mol-util/marker-action';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { AnnotationLabelTextParams, AnnotationLabelTextVisual } from './label-visual';


const AnnotationLabelVisuals = {
    'label-text': (ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, AnnotationLabelTextParams>) => ComplexRepresentation('Label text', ctx, getParams, AnnotationLabelTextVisual),
};

export const AnnotationLabelParams = {
    ...AnnotationLabelTextParams,
    visuals: PD.MultiSelect(['label-text'], PD.objectToOptions(AnnotationLabelVisuals)),
    // ...Original.LabelParams,
};
export type AnnotationLabelParams = typeof AnnotationLabelParams
export type AnnotationLabelProps = PD.ValuesFor<AnnotationLabelParams>
export function getLabelParams(ctx: ThemeRegistryContext, structure: Structure) {
    return AnnotationLabelParams;
}
export type AnnotationLabelRepresentation = StructureRepresentation<AnnotationLabelParams>
export function AnnotationLabelRepresentation(ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, AnnotationLabelParams>): AnnotationLabelRepresentation {
    const repr = Representation.createMulti('Label', ctx, getParams, StructureRepresentationStateBuilder, AnnotationLabelVisuals as unknown as Representation.Def<Structure, AnnotationLabelParams>);
    repr.setState({ pickable: false, markerActions: MarkerAction.None });
    return repr;
}

export const AnnotationLabelRepresentationProvider = StructureRepresentationProvider({
    name: 'mvs-annotation-label',
    label: 'Annotation Label',
    description: 'Displays labels based on annotation custom model property',
    factory: AnnotationLabelRepresentation,
    getParams: getLabelParams,
    defaultValues: PD.getDefaultValues(AnnotationLabelParams),
    defaultColorTheme: { name: 'uniform' }, // this ain't workin
    defaultSizeTheme: { name: 'physical' },
    isApplicable: (structure: Structure) => structure.elementCount > 0,
});
