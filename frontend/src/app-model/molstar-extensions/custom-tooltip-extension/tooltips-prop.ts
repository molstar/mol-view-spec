import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomStructureProperty } from 'molstar/lib/mol-model-props/common/custom-structure-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { Loci } from 'molstar/lib/mol-model/loci';
import { Structure, StructureElement } from 'molstar/lib/mol-model/structure';
import { LociLabelProvider } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { ElementSet, Selector, SelectorParams, elementSetFromSelector, elementSetHas } from '../multilayer-color-theme-extension/color';
import { filterDefined } from '../../utils';


/** Parameter definition for custom structure property "CustomTooltips" */
export const CustomTooltipsParams = {
    tooltips: PD.ObjectList(
        {
            selector: SelectorParams,
            text: PD.Text('tooltip :D', { description: 'Text of the tooltip' }),
        },
        obj => obj.text
    ),
};
export type CustomTooltipsParams = typeof CustomTooltipsParams

/** Parameter values of custom structure property "CustomTooltips" */
export type CustomTooltipsProps = PD.Values<CustomTooltipsParams>

/** Values of custom structure property "CustomTooltips" (and for its params at the same type) */
export type CustomTooltipsData = { selector: Selector, text: string, elementSet?: ElementSet }[]


/** Provider for custom structure property "CustomTooltips" */
export const CustomTooltipsProvider: CustomStructureProperty.Provider<CustomTooltipsParams, CustomTooltipsData> = CustomStructureProperty.createProvider({
    label: 'Custom Tooltips',
    descriptor: CustomPropertyDescriptor<any, any>({
        name: 'custom-tooltips',
    }),
    type: 'local',
    defaultParams: CustomTooltipsParams,
    getParams: (data: Structure) => CustomTooltipsParams,
    isApplicable: (data: Structure) => data.root === data,
    obtain: async (ctx: CustomProperty.Context, data: Structure, props: Partial<CustomTooltipsProps>) => {
        const fullProps = { ...PD.getDefaultValues(CustomTooltipsParams), ...props };
        const value = fullProps.tooltips.map(t => ({
            selector: t.selector,
            text: t.text,
        } satisfies CustomTooltipsData[number]));
        return { value: value } satisfies CustomProperty.Data<CustomTooltipsData>;
    },
});


/** Label provider based on  custom structure property "CustomTooltips" */
export const CustomTooltipsLabelProvider = {
    label: (loci: Loci): string | undefined => {
        switch (loci.kind) {
            case 'element-loci':
                const location = StructureElement.Loci.getFirstLocation(loci);
                if (!location) return undefined;
                const tooltipData = CustomTooltipsProvider.get(location.structure).value;
                if (!tooltipData || tooltipData.length === 0) return undefined;
                const texts = [];
                for (const tooltip of tooltipData) {
                    const elements = tooltip.elementSet ??= elementSetFromSelector(location.structure, tooltip.selector);
                    if (elementSetHas(elements, location)) texts.push(tooltip.text);
                }
                return filterDefined(texts).join(' | ');
            // return '¯\\_(ツ)_/¯';
            default:
                return undefined;
        }
    }
} satisfies LociLabelProvider;
