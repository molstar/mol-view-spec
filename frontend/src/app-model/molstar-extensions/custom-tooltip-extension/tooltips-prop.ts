import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomStructureProperty } from 'molstar/lib/mol-model-props/common/custom-structure-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { Loci } from 'molstar/lib/mol-model/loci';
import { Structure, StructureElement } from 'molstar/lib/mol-model/structure';
import { LociLabelProvider } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { SelectorParams } from '../multilayer-color-theme-extension/color';


/** Parameter definition for custom structure property "AnnotationTooltips" */
export const CustomTooltipsParams = {
    tooltips: PD.ObjectList(
        {
            selector: SelectorParams,
            text: PD.Text('tooltip :D', { description: 'Text of the tooltip' }),
        },
        obj => obj.text
    ),
};
export type AnnotationTooltipsParams = typeof CustomTooltipsParams

/** Values of custom structure property "AnnotationTooltips" (and for its params at the same type) */
export type AnnotationTooltipsProps = PD.Values<AnnotationTooltipsParams>


/** Provider for custom structure property "AnnotationTooltips" */
export const CustomTooltipsProvider: CustomStructureProperty.Provider<AnnotationTooltipsParams, AnnotationTooltipsProps> = CustomStructureProperty.createProvider({
    label: 'Custom Tooltips',
    descriptor: CustomPropertyDescriptor<any, any>({
        name: 'custom-tooltips',
    }),
    type: 'local',
    defaultParams: CustomTooltipsParams,
    getParams: (data: Structure) => CustomTooltipsParams,
    isApplicable: (data: Structure) => data.root === data,
    obtain: async (ctx: CustomProperty.Context, data: Structure, props: Partial<AnnotationTooltipsProps>) => {
        console.log('CustomTooltipsProvider obtain')
        const fullProps = { ...PD.getDefaultValues(CustomTooltipsParams), ...props };
        // for (const model of data.models) await AnnotationsProvider.attach(ctx, model); // TODO I should probably detach somewhere but I have nooooo idea where
        return { value: fullProps } satisfies CustomProperty.Data<AnnotationTooltipsProps>;
    },
});


/** Label provider based on data from "Annotation" custom model property */
export const CustomTooltipsLabelProvider = {
    label: (loci: Loci): string | undefined => {
        console.log('CustomTooltipsProvider label')
        switch (loci.kind) {
            case 'element-loci':
                // const location = StructureElement.Loci.getFirstLocation(loci);
                // if (!location) return undefined;
                // const tooltipProps = CustomTooltipsProvider.get(location.structure).value;
                // if (!tooltipProps || tooltipProps.tooltips.length === 0) return undefined;

                // const annotations = AnnotationsProvider.get(location.unit.model).value;
                // const texts = tooltipProps.tooltips.map(p => annotations?.getAnnotation(p.annotationId)?.getValueForLocation(location, p.fieldName));
                // return filterDefined(texts).join(' | ');
                return '¯\\_(ツ)_/¯';
            default:
                return undefined;
        }
    }
} satisfies LociLabelProvider;
