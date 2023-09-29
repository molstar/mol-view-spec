/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';


/** The magic with negative zero looks crazy, but it's needed if we want to be able to write negative numbers, LOL. Please help if you know a better solution. */
function parseMaybeInt(input: string): number | undefined {
    if (input.trim() === '-') return -0;
    const num = parseInt(input);
    return isNaN(num) ? undefined : num;
}
function stringifyMaybeInt(num: number | undefined): string {
    if (num === undefined) return '';
    if (Object.is(num, -0)) return '-';
    return num.toString();
}
export function PD_MaybeInteger(defaultValue?: number, info?: PD.Info): PD.Base<number | undefined> {
    return PD.Converted<number | undefined, PD.Text>(stringifyMaybeInt, parseMaybeInt, PD.Text(stringifyMaybeInt(defaultValue), info));
}

function parseMaybeString(input: string): string | undefined {
    return input === '' ? undefined : input;
}
function stringifyMaybeString(str: string | undefined): string {
    return str === undefined ? '' : str;
}
export function PD_MaybeString(defaultValue?: string, info?: PD.Info): PD.Base<string | undefined> {
    return PD.Converted<string | undefined, PD.Text>(stringifyMaybeString, parseMaybeString, PD.Text(stringifyMaybeString(defaultValue), info));
}
