import * as t from 'io-ts';

import { validateField, RequiredField, choice, nullable, validateParams, validateParamsNoExtra, validateFullParamsNoExtra, validateFullParams, OptionalField } from '../params-schema';


describe('validateField', () => {
    it('validateField string', async () => {
        const stringField = RequiredField(t.string);
        expect(validateField(stringField, 'hello')).toBeTruthy();
        expect(validateField(stringField, '')).toBeTruthy();
        expect(validateField(stringField, 5)).toBeFalsy();
        expect(validateField(stringField, null)).toBeFalsy();
        expect(validateField(stringField, undefined)).toBeFalsy();
    });
    it('validateField string choice', async () => {
        const colorParam = RequiredField(choice('red', 'green', 'blue', 'yellow'));
        expect(validateField(colorParam, 'red')).toBeTruthy();
        expect(validateField(colorParam, 'green')).toBeTruthy();
        expect(validateField(colorParam, 'blue')).toBeTruthy();
        expect(validateField(colorParam, 'yellow')).toBeTruthy();
        expect(validateField(colorParam, 'banana')).toBeFalsy();
        expect(validateField(colorParam, 5)).toBeFalsy();
        expect(validateField(colorParam, null)).toBeFalsy();
        expect(validateField(colorParam, undefined)).toBeFalsy();
    });
    it('validateField number choice', async () => {
        const numberParam = RequiredField(choice(1, 2, 3, 4));
        expect(validateField(numberParam, 1)).toBeTruthy();
        expect(validateField(numberParam, 2)).toBeTruthy();
        expect(validateField(numberParam, 3)).toBeTruthy();
        expect(validateField(numberParam, 4)).toBeTruthy();
        expect(validateField(numberParam, 5)).toBeFalsy();
        expect(validateField(numberParam, '1')).toBeFalsy();
        expect(validateField(numberParam, null)).toBeFalsy();
        expect(validateField(numberParam, undefined)).toBeFalsy();
    });
    it('validateField int', async () => {
        const numberParam = RequiredField(t.Integer);
        expect(validateField(numberParam, 1)).toBeTruthy();
        expect(validateField(numberParam, 0)).toBeTruthy();
        expect(validateField(numberParam, 0.5)).toBeFalsy();
        expect(validateField(numberParam, '1')).toBeFalsy();
        expect(validateField(numberParam, null)).toBeFalsy();
        expect(validateField(numberParam, undefined)).toBeFalsy();
    });
    it('validateField union', async () => {
        const stringOrNumberParam = RequiredField(t.union([t.string, t.number]));
        expect(validateField(stringOrNumberParam, 1)).toBeTruthy();
        expect(validateField(stringOrNumberParam, 2)).toBeTruthy();
        expect(validateField(stringOrNumberParam, 'hello')).toBeTruthy();
        expect(validateField(stringOrNumberParam, '')).toBeTruthy();
        expect(validateField(stringOrNumberParam, true)).toBeFalsy();
        expect(validateField(stringOrNumberParam, null)).toBeFalsy();
        expect(validateField(stringOrNumberParam, undefined)).toBeFalsy();
    });
    it('validateField nullable', async () => {
        const stringOrNullParam = RequiredField(nullable(t.string));
        expect(validateField(stringOrNullParam, 'hello')).toBeTruthy();
        expect(validateField(stringOrNullParam, '')).toBeTruthy();
        expect(validateField(stringOrNullParam, null)).toBeTruthy();
        expect(validateField(stringOrNullParam, 1)).toBeFalsy();
        expect(validateField(stringOrNullParam, true)).toBeFalsy();
        expect(validateField(stringOrNullParam, undefined)).toBeFalsy();
    });
});

const schema = {
    name: OptionalField(t.string),
    surname: RequiredField(t.string),
    lunch: RequiredField(t.boolean),
    age: OptionalField(t.number),
}

describe('validateParams', () => {
    it('validateParams', async () => {
        expect(validateParamsNoExtra(schema, { surname: 'Doe', lunch: true })).toBeTruthy();
        expect(validateParamsNoExtra(schema, { name: 'John', surname: 'Doe', lunch: true })).toBeTruthy();
        expect(validateParamsNoExtra(schema, { surname: 'Doe', lunch: true, age: 29 })).toBeTruthy();
        expect(validateParamsNoExtra(schema, { name: 'John', surname: 'Doe', lunch: true, age: 29 })).toBeTruthy();
        expect(validateParamsNoExtra(schema, {})).toBeFalsy();
        expect(validateParamsNoExtra(schema, { name: 'John', surname: 'Doe', age: 29 })).toBeFalsy(); // missing `lunch`
        expect(validateParamsNoExtra(schema, { name: 'John', surname: 'Doe', lunch: true, age: 'old' })).toBeFalsy(); // wrong type of `age`
        expect(validateParamsNoExtra(schema, { surname: 'Doe', lunch: true, married: false })).toBeFalsy(); // extra param `married`
        expect(validateParams(schema, { surname: 'Doe', lunch: true, married: false })).toBeTruthy(); // extra param `married`
    });
});


describe('validateFullParams', () => {
    it('validateFullParams', async () => {
        expect(validateFullParamsNoExtra(schema, { surname: 'Doe', lunch: true })).toBeFalsy();
        expect(validateFullParamsNoExtra(schema, { name: 'John', surname: 'Doe', lunch: true })).toBeFalsy();
        expect(validateFullParamsNoExtra(schema, { surname: 'Doe', lunch: true, age: 29 })).toBeFalsy();
        expect(validateFullParamsNoExtra(schema, { name: 'John', surname: 'Doe', lunch: true, age: 29 })).toBeTruthy();
        expect(validateFullParamsNoExtra(schema, {})).toBeFalsy();
        expect(validateFullParamsNoExtra(schema, { name: 'John', surname: 'Doe', lunch: true, age: 'old' })).toBeFalsy(); // wrong type of `age`
        expect(validateFullParamsNoExtra(schema, { name: 'John', surname: 'Doe', lunch: true, age: 29, married: true })).toBeFalsy(); // extra param `married`
        expect(validateFullParams(schema, { name: 'John', surname: 'Doe', lunch: true, age: 29, married: true })).toBeTruthy(); // extra param `married`
    });
});

