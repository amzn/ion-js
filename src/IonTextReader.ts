/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */

// Text reader.  This is a user reader built on top of
// the IonParserTextRaw parser.
//
// Handles system symbols, and conversion from the parsed
// input string to the desired Javascript value (scalar or
// object, such as IonValue).

import { Decimal } from "./IonDecimal";
import { getSystemSymbolTable } from "./IonSymbols";
import { ion_symbol_table } from "./IonSymbols";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { IVM } from "./IonConstants";
import { makeSymbolTable } from "./IonSymbols";
import { ParserTextRaw } from "./IonParserTextRaw";
import { Reader } from "./IonReader";
import { Span } from "./IonSpan";
import { SymbolTable } from "./IonSymbols";
import { Timestamp } from "./IonTimestamp";

const RAW_STRING = new IonType( -1, "raw_input", true,  false, false, false );
const ERROR = new IonType( -2, "error", true,  false, false, false );

const BOC = -2; // cloned from IonParserTextRaw
const EOF = -1;
const T_IDENTIFIER = 9;
const T_STRUCT = 19;

export class TextReader implements Reader {
  private _parser: ParserTextRaw;
  private _depth: number;
  private _cat: any;
  private _symtab: SymbolTable;
  private _type: IonType;
  private _raw_type: number;
  private _raw: any;

  constructor(source: Span, catalog) {
    if (!source) {
      throw new Error("a source Span is required to make a reader");
    }

    this._parser   = new ParserTextRaw(source);
    this._depth    = 0;
    this._cat      = catalog;
    this._symtab   = getSystemSymbolTable();
    this._type     = ERROR;
    this._raw_type = undefined;
    this._raw      = undefined;
  }

  load_raw() {
    let t: TextReader = this;
    if (t._raw !== undefined) return;
    if (t.isNull()) return;
    t._raw = t._parser.get_value_as_string(t._raw_type);
    return;
  }

  skip_past_container() {
    var type, 
        d = 1,  // we want to have read the EOC tha matches the container we just saw
        p = this._parser;
    while (d > 0) {
      type = p.next();
      if (type === undefined) { // end of container
        d--;
      }
      else if (type.container) {
        d++;
      }
    }
  }

  next() {
    var type, p, rt, t = this;
    t._raw = undefined;
    if (t._raw_type === EOF) {
      return undefined;
    }
    if (t._type && t._type.container) {
      this.skip_past_container();
    }
    p = t._parser;
    for (;;) {
      t._raw_type = rt = p.next();
      if (t._depth > 0) break;
      if (rt === T_IDENTIFIER) { 
        this.load_raw();
        if (t._raw != IVM.text) break;
        t._symtab = getSystemSymbolTable();
      }
      else if (rt === T_STRUCT) {
        if (p._ann.length !== 1) break;
        if (p._ann[0] != ion_symbol_table) break;
        t._symtab = makeSymbolTable(t._cat, t);
      }
      else {
        break;
      }
    }

    if (rt === ERROR) {
      throw new Error();
    }

    // for system value (IVM's and symbol table's) we continue 
    // around this
    type = p.get_ion_type(rt);
    t._type = type || EOF;
    return type;
  }

  stepIn() {
    var t = this;
    if (!t._type.container) {
      throw new Error("can't step in to a scalar value");
    }
    t._raw_type = BOC;
    t._depth++;
  }

  stepOut() {
    var t = this;
    while ( t._raw_type != EOF ) {
      t.next();
    }
    t._raw_type = undefined;
    t._depth--;
  }

  valueType() : IonType {
    return this._type;
  }

  depth() : number {
    return this._depth;
  }

  fieldName() : string {
    return this._parser.fieldName();
  }

  annotations() : string[] {
    return this._parser.annotations();
  }

  isNull() : boolean {
    if (this._type === IonTypes.NULL) return true;
    return this._parser.isNull();
  }

  stringValue() : string {
    var i, s, t = this;
    this.load_raw();
    if (t.isNull()) {
      s = "null";
      if (t._type != IonTypes.NULL) {
        s += "." + t._type.name;
      }
    }
    else if (t._type.scalar) {
      // BLOB is a scalar by you don't want to just use the string 
      // value otherwise all other scalars are fine as is
      if (t._type !== IonTypes.BLOB) {
        s = t._raw;
      }
      else {
        s = t._raw;   // TODO - this is a temp fix !!
      }
    }
    else {
      i = t.ionValue();
      s = i.stringValue();
    }
    return s;
  }

  numberValue() {
    if (!this._type.num) {
      return undefined;
    }
    return this._parser.numberValue();
  }

  byteValue() : number[] {
    throw new Error("E_NOT_IMPL: byteValue");
  }

  booleanValue() {
    if (this._type !== IonTypes.BOOL) {
      return undefined;
    }
    return this._parser.booleanValue();
  }

  decimalValue() : Decimal {
    throw new Error("E_NOT_IMPL: decimalValue");
  }

  timestampValue() : Timestamp {
    throw new Error("E_NOT_IMPL: timestampValue");
  }

  value() : any {
    throw new Error("E_NOT_IMPL: value");
  }

  ionValue() {
    throw new Error("E_NOT_IMPL: ionValue");
  }
}
