import * as t from 'io-ts';
import { PathReporter } from 'io-ts/PathReporter';


type AllowedValueTypes = string | number | boolean | null

export function choice<V extends string | number | boolean>(v1: V, v2: V, ...others: V[]) {
    return t.union([t.literal(v1), t.literal(v2), ...others.map(v => t.literal(v))]);
}
export function nullable<T extends t.Type<any>>(type: T) {
    return t.union([type, t.null]);
}

interface Field<V extends AllowedValueTypes = any, R extends boolean = boolean> {
    /** Definition of allowed types for the field */
    type: t.Type<V>,
    /** If `required===true`, the value must always be defined in molviewspec format (can be `null` if `type` allows it).
     * If `required===false`, the value can be ommitted (meaning that a default should be used).
     * If `type` allows `null`, the default must be `null`. */
    required: R,
    /** Description of what the field value means */
    description?: string,
}
export interface RequiredField<V extends AllowedValueTypes = any> extends Field<V> {
    required: true,
}
export interface OptionalField<V extends AllowedValueTypes = any> extends Field<V> {
    required: false,
}

export function RequiredField<V extends AllowedValueTypes>(type: t.Type<V>, description?: string): RequiredField<V> {
    return { type, required: true, description };
}
export function OptionalField<V extends AllowedValueTypes>(type: t.Type<V>, description?: string): OptionalField<V> {
    return { type, required: false, description };
}

/** Type of valid value for field of type `F` (never includes `undefined`, even if field is optional) */
export type ValueFor<F extends Field> = F extends Field<infer V> ? V : never

/** Type of valid default value for field of type `F` (if the field's type allows `null`, the default must be `null`) */
export type DefaultFor<F extends Field> = F extends Field<infer V> ? (null extends V ? null : V) : never


export type ParamsSchema<TKey extends string = string> = { [key in TKey]: Field }

export type FullValuesFor<P extends ParamsSchema> = { [key in keyof P]: ValueFor<P[key]> }
export type ValuesFor<P extends ParamsSchema> =
    { [key in keyof P as (P[key] extends RequiredField<any> ? key : never)]: ValueFor<P[key]> }
    & { [key in keyof P as (P[key] extends OptionalField<any> ? key : never)]?: ValueFor<P[key]> }
export type DefaultsFor<P extends ParamsSchema> = { [key in keyof P as (P[key] extends Field<any, false> ? key : never)]: ValueFor<P[key]> }


type Issues = string[]

/** Return `undefined` if `value` has correct type for `field`, regardsless of if required or optional.
 * Return description of validation issues, if `value` has wrong type.
 */
export function fieldValidationIssues<F extends Field, V>(field: F, value: V): V extends ValueFor<F> ? undefined : Issues {
    const validation = field.type.decode(value);
    if (validation._tag === 'Right') {
        return undefined as Issues | undefined as any;
    } else {
        return PathReporter.report(validation) as Issues | undefined as any;
    }
}

/** Return `undefined` if `values` contains correct value types for `schema`,
 * return description of validation issues, if `values` have wrong type.
 * If `options.requireAll`, all parameters (including optional) must have a value provided.
 * If `options.noExtra` is true, presence of any extra parameters is treated as an issue.
 */
export function paramsValidationIssues<P extends ParamsSchema, V extends { [k: string]: any }>(schema: P, values: V, options: { requireAll?: boolean, noExtra?: boolean } = {}): Issues | undefined {
    for (const key in schema) {
        const paramDef = schema[key];
        if (Object.hasOwn(values, key)) {
            const value = values[key];
            const issues = fieldValidationIssues(paramDef, value);
            if (issues) return [`Invalid type for parameter "${key}":`, ...issues];
        } else {
            if (paramDef.required) return [`Missing required parameter "${key}":`];
            if (options.requireAll) return [`Missing optional parameter "${key}":`];
        }
    }
    if (options.noExtra) {
        for (const key in values) {
            if (!Object.hasOwn(schema, key)) return [`Unknown parameter "${key}"`];
        }
    }
    return undefined;
}
