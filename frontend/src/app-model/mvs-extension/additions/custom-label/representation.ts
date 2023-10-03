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

import { CustomLabelTextParams, CustomLabelTextVisual } from './visual';


const CustomLabelVisuals = {
    'label-text': (ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, CustomLabelTextParams>) => ComplexRepresentation('Label text', ctx, getParams, CustomLabelTextVisual),
};

export const CustomLabelParams = {
    ...CustomLabelTextParams,
    visuals: PD.MultiSelect(['label-text'], PD.objectToOptions(CustomLabelVisuals)),
    // ...Original.LabelParams,
};
export type CustomLabelParams = typeof CustomLabelParams
export type CustomLabelProps = PD.ValuesFor<CustomLabelParams>
export function getLabelParams(ctx: ThemeRegistryContext, structure: Structure) {
    return CustomLabelParams;
}
// export const LabelParams = {
//     ...LabelTextParams,
//     visuals: PD.MultiSelect(['label-text'], PD.objectToOptions(LabelVisuals)),
// };
// export type LabelParams = typeof LabelParams
// export function getLabelParams(ctx: ThemeRegistryContext, structure: Structure) {
//     return LabelParams;
// }

export type CustomLabelRepresentation = StructureRepresentation<CustomLabelParams>
export function CustomLabelRepresentation(ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, CustomLabelParams>): CustomLabelRepresentation {
    const repr = Representation.createMulti('Label', ctx, getParams, StructureRepresentationStateBuilder, CustomLabelVisuals as unknown as Representation.Def<Structure, CustomLabelParams>);
    repr.setState({ pickable: false, markerActions: MarkerAction.None });
    return repr;
}
// export type LabelRepresentation = StructureRepresentation<LabelParams>
// export function LabelRepresentation(ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, LabelParams>): LabelRepresentation {
//     const repr = Representation.createMulti('Label', ctx, getParams, StructureRepresentationStateBuilder, LabelVisuals as unknown as Representation.Def<Structure, LabelParams>);
//     repr.setState({ pickable: false, markerActions: MarkerAction.None });
//     return repr;
// }

export const CustomLabelRepresentationProvider = StructureRepresentationProvider({
    name: 'mvs-custom-label',
    label: 'Custom Label',
    description: 'Displays labels with custom text',
    factory: CustomLabelRepresentation,
    getParams: getLabelParams,
    defaultValues: PD.getDefaultValues(CustomLabelParams),
    defaultColorTheme: { name: 'uniform' }, // this ain't workin
    defaultSizeTheme: { name: 'physical' },
    isApplicable: (structure: Structure) => structure.elementCount > 0
});
