import { z } from "zod";

/**
 * Recursively serializes a value into a binary Buffer based on its Zod schema.
 *
 * @param {z.ZodType} schema The Zod schema for the value to serialize.
 * @param {any} value The value to serialize.
 * @returns {Buffer} The serialized Buffer.
 */
export function serialize(value: any, schema: z.ZodType): Buffer {
  switch (schema.type) {
    case "boolean":
      const booleanBuffer = Buffer.alloc(1);
      booleanBuffer.write(
        value === undefined ? "U" : value ? "T" : "F",
        "utf-8"
      );
      return booleanBuffer;

    case "int":
      const intBuffer = Buffer.alloc(4);
      intBuffer.writeInt32BE(!value ? 2_147_483_647 : value);
      return intBuffer;

    case "number":
      const numberBuffer = Buffer.alloc(4);
      // storing as a integer with two decimal precision
      numberBuffer.writeInt32BE(
        value === undefined ? 2_147_483_647 : value * 100
      );

      return numberBuffer;

    case "bigint":
      // 1. Get the Hex representation of the current value
      let valHex = BigInt(value || 0).toString(16);
      if (valHex.length % 2 !== 0) valHex = "0" + valHex;

      // Variable length logic
      const byteLength = valHex.length / 2;
      const bigintBuffer = Buffer.alloc(byteLength + 2);
      bigintBuffer.writeUInt16BE(byteLength);
      bigintBuffer.write(valHex, 2, "hex");

      return bigintBuffer;

    case "date":
      const dateBuffer = Buffer.alloc(8);
      dateBuffer.writeBigUInt64BE(
        BigInt(value ? new Date(value).getTime() : 0)
      );
      return dateBuffer;

    case "string":
      const stringValue = value ? String(value) : "";

      const { maxLength: maxString } = schema as z.ZodString;

      let stringBuffer: Buffer<ArrayBuffer>;

      if (maxString) {
        stringBuffer = Buffer.alloc(maxString);
        stringBuffer.write(stringValue, "utf-8");

        return stringBuffer;
      }

      stringBuffer = Buffer.from(stringValue, "utf-8");

      const stringLengthBuffer = Buffer.alloc(2);
      stringLengthBuffer.writeUInt16BE(stringBuffer.length);

      return Buffer.concat([stringLengthBuffer, stringBuffer]);

    case "array":
      const arrayShape = schema as z.ZodArray<z.ZodAny>;

      const arrayLengthBuffer = Buffer.alloc(2);
      arrayLengthBuffer.writeUInt16BE(!value ? 65_535 : value.length);

      const arrayBuffer: Buffer[] = [arrayLengthBuffer];

      if (value && value.length > 0) {
        for (const element of value) {
          arrayBuffer.push(serialize(element, arrayShape.element));
        }
      }

      return Buffer.concat(arrayBuffer);

    case "object":
      const objectShape = (schema as z.ZodObject).shape;
      const keys = Object.keys(objectShape);

      const objectBuffer: Buffer[] = [];

      for (const key of keys) {
        objectBuffer.push(serialize(value[key], objectShape[key]));
      }

      return Buffer.concat(objectBuffer);

    case "enum":
      const enumOptions = (schema as z.ZodEnum).options;

      const enumIndex = enumOptions.findIndex((element) => element === value);

      const enumBuffer = Buffer.alloc(1);
      enumBuffer.writeUInt8(enumIndex, 0);

      return enumBuffer;

    case "optional":
      return serialize(value, (schema as z.ZodOptional<z.ZodAny>).unwrap());

    case "pipe":
      return serialize(value, (schema as z.ZodPipe<z.ZodAny>).in);

    default:
      throw new Error(`Invalid type: ${schema.type}`);
  }
}

/**
 * Recursively deserializes a binary Buffer into a the shape of its Zod schema.
 *
 * @param {Buffer} buffer The buffer to deserialize from.
 * @param {number} offset The current offset in the buffer.
 * @param {z.ZodType} schema The Zod schema to guide deserialization.
 * @returns {{ offset: number; value: any }} An object containing the deserialized value and the new offset.
 */
export function deserialize(
  buffer: Buffer,
  offset: number,
  schema: z.ZodType
): { offset: number; value: any } {
  let value: any = undefined;
  let bytesRead = 0;

  switch (schema.type) {
    case "boolean":
      const boolean = buffer.toString("utf-8", offset, offset + 1);
      if (boolean !== "U") value = boolean === "T";
      bytesRead = 1;
      break;

    case "int":
      const int = buffer.readInt32BE(offset);
      if (int !== 2_147_483_647) value = int;
      bytesRead = 4;
      break;

    case "number":
      const number = buffer.readInt32BE(offset);
      if (number !== 2_147_483_647) value = number / 100;
      bytesRead = 4;
      break;

    case "bigint":
      const byteLength = buffer.readUInt16BE(offset);
      bytesRead = 2;

      if (byteLength !== 0) {
        const hexStr = buffer.toString(
          "hex",
          offset + bytesRead,
          offset + bytesRead + byteLength
        );
        value = BigInt("0x" + hexStr);
        bytesRead += byteLength;
      } else {
        value = BigInt(0);
      }

      break;

    case "date":
      const date = Number(buffer.readBigUInt64BE(offset));
      if (date !== 0) value = new Date(date);
      bytesRead = 8;
      break;

    case "string":
      const { maxLength: maxString } = schema as z.ZodString;

      let stringLength: number;

      if (maxString) {
        stringLength = maxString;
      } else {
        stringLength = buffer.readUInt16BE(offset);
        bytesRead = 2;
      }

      const string = buffer.toString(
        "utf-8",
        offset + bytesRead,
        offset + bytesRead + stringLength
      );

      if (string !== "") value = string.replaceAll("\x00", "");
      bytesRead += stringLength;
      break;

    case "array":
      const arrayShape = schema as z.ZodArray<z.ZodType>;

      const arrayLength = buffer.readUInt16BE(offset);
      bytesRead = 2;

      if (arrayLength !== 65_535) {
        const array = [];
        for (let i = 0; i < arrayLength; i++) {
          const { value: element, offset: elementOffset } = deserialize(
            buffer,
            offset + bytesRead,
            arrayShape.element
          );

          array.push(element);
          bytesRead = elementOffset - offset;
        }

        value = array;
      }
      break;

    case "object":
      const objectShape = (schema as z.ZodObject).shape;
      const object: Record<string, any> = {};

      for (const key of Object.keys(objectShape)) {
        const { value: propValue, offset: propOffset } = deserialize(
          buffer,
          offset + bytesRead,
          objectShape[key]
        );

        object[key] = propValue;
        bytesRead = propOffset - offset;
      }

      value = object;
      break;

    case "enum":
      const enumOptions = (schema as z.ZodEnum).options;
      const enumIndex = buffer.readUInt8(offset);

      value = enumOptions[enumIndex];
      bytesRead = 1;
      break;

    case "pipe":
      return deserialize(buffer, offset, (schema as z.ZodPipe<z.ZodAny>).in);

    case "optional":
      return deserialize(
        buffer,
        offset,
        (schema as z.ZodOptional<z.ZodAny>).unwrap()
      );

    default:
      throw new Error(`Invalid type: ${schema.type}`);
  }

  return { value, offset: offset + bytesRead };
}

export function getLength(schema: z.ZodType): number {
  let bytesRead = 0;

  switch (schema.type) {
    case "boolean":
      bytesRead = 1;
      break;

    case "int":
      bytesRead = 4;
      break;

    case "number":
      bytesRead = 4;
      break;

    case "bigint":
      throw new Error("Cannot get the size of a variable length bigint.");

    case "date":
      bytesRead = 8;
      break;

    case "string":
      const { maxLength: maxString } = schema as z.ZodString;

      if (!maxString) {
        throw new Error("Cannot get the size of a variable length string.");
      }

      bytesRead = maxString;
      break;

    case "array":
      throw new Error(
        "Cannot get the size of a schema with an array of variable length."
      );

    case "object":
      const objectShape = (schema as z.ZodObject).shape;

      for (const key of Object.keys(objectShape)) {
        bytesRead += getLength(objectShape[key]);
      }

      break;

    case "enum":
      bytesRead = 1;
      break;

    case "pipe":
      return getLength((schema as z.ZodPipe<z.ZodAny>).in);

    case "optional":
      return getLength((schema as z.ZodOptional<z.ZodAny>).unwrap());

    default:
      throw new Error(`Invalid type: ${schema.type}`);
  }

  return bytesRead;
}
