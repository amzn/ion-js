import {DomValue} from "./DomValue";
import {IonTypes} from "../Ion";
import * as ion from "../Ion";

/**
 * Represents a decimal[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#decimal
 */
export class Decimal extends DomValue(Number, IonTypes.DECIMAL) {
    private readonly _decimalValue: ion.Decimal;
    private readonly _numberValue: number;

    /**
     * Constructor.
     * @param value         The numeric value to represent as a decimal.
     * @param annotations   An optional array of strings to associate with `value`.
     */
    constructor(value: ion.Decimal, annotations: string[] = []) {
        super(...[value.getCoefficient(), value.getExponent(), value.isNegative()]);
        this._decimalValue = value;
        this._numberValue = value.numberValue();
        this._setAnnotations(annotations);
    }

    numberValue(): number {
        return this._numberValue;
    }

    decimalValue(): ion.Decimal {
        return this._decimalValue;
    }

    toString(): string {
        return this._decimalValue.toString();
    }

    // Required to produce sensible output for toString().
    // Without it, toString() relies on the underlying Decimal value's coefficient.
    valueOf(): number {
        return this._numberValue;
    }
}