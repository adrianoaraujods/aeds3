import * as fs from "fs";
import { z } from "zod";

import type { ActionResponse } from "@/lib/config";

type Config<TSchema extends z.ZodObject> = {
  name: string;
  schema: TSchema;
  uniques: (keyof Omit<z.infer<TSchema>, "id">)[];
};

/**
 * A class for managing data locally in a single binary file.
 * It uses Zod schemas for data validation and stores records in a custom binary format.
 *
 * Each record in the database file is structured as follows:
 * - 4 bytes: Record ID (UInt32BE)
 * - 1 byte: Is Valid (UInt8) (1 for valid, 0 for deleted/invalidated)
 * - 2 bytes: Length of the data payload (UInt16BE)
 * - N bytes: Serialized data payload
 * The first 4 bytes of the file are reserved for a serial counter (last used ID).
 *
 * @template TSchema The Zod schema for the data records.
 */
export class ByteFile<TSchema extends z.ZodObject> {
  private readonly schema;
  private readonly dataFilePath;
  private readonly uniques;

  /**
   * Creates an instance of ByteFile.
   * @param {object} config The configuration object.
   * @param {string} config.name The name of the database file (e.g., 'users').
   * @param {TSchema} config.schema The Zod schema for the data to be stored.
   * @param {Array<keyof Omit<z.infer<TSchema>, "id">>} config.uniques An array of property keys that must be unique within the data set.
   */
  constructor({ name, schema, uniques }: Config<TSchema>) {
    this.schema = schema.omit({ id: true });
    this.uniques = uniques;
    this.dataFilePath = `./data/${name}.db`;
  }

  /**
   * Inserts a new record into the database file.
   *
   * @param {Omit<z.infer<TSchema>, "id">} data The data to insert.
   * @returns {ActionResponse<z.infer<TSchema> & { id: number }>} A response object indicating success, status code, and the new record with its assigned ID.
   */
  public insert(
    data: Omit<z.infer<TSchema>, "id">
  ): ActionResponse<z.infer<TSchema> & { id: number }> {
    const parser = this.schema.safeParse(data);
    if (!parser.success) return { ok: false, status: 400 };

    const parsedData = parser.data as z.infer<TSchema>;

    try {
      const buffer = fs.readFileSync(this.dataFilePath);
      let offset = 4; // skip serial bytes

      while (offset < buffer.length) {
        offset += 4; // skip current id

        const isValid = buffer.readUIntBE(offset, 1) === 1;
        offset += 1;

        const length = buffer.readUInt16BE(offset);
        offset += 2;

        if (isValid) {
          const { value } = this.deserialize(buffer, offset, this.schema);

          const parser = this.schema.safeParse(value);

          if (!parser.success) {
            return { ok: false, status: 509 };
          }

          const parsedData = parser.data as z.infer<TSchema> & { id: number };

          for (const key of this.uniques) {
            if (parsedData[key] === data[key]) {
              return { ok: false, status: 409 };
            }
          }
        }

        offset += length;
      }
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        return { ok: false, status: 500 };
      }
    }

    try {
      const id = this.serial();

      const buffer = this.create(id, parsedData);

      fs.appendFileSync(this.dataFilePath, buffer);

      return { ok: true, status: 201, data: { ...parsedData, id } };
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  /**
   * Updates an existing record in the database file.
   * This method marks the old record as invalid and appends the new record.
   *
   * @param {number} id The ID of the record to update.
   * @param {z.infer<TSchema>} patch The new data to apply.
   * @returns {ActionResponse<z.infer<TSchema> & { id: number }>} A response object indicating success, status code, and the updated record.
   */
  public update(
    id: number,
    patch: z.infer<TSchema>
  ): ActionResponse<z.infer<TSchema> & { id: number }> {
    const parser = this.schema.safeParse(patch);
    if (!parser.success) return { ok: false, status: 400 };

    const patchData = parser.data as z.infer<TSchema>;

    let isValidByteOffset: number | null = null;

    try {
      const buffer = fs.readFileSync(this.dataFilePath);
      let offset = 4; // skip serial bytes

      while (offset < buffer.length) {
        const currentId = buffer.readUInt32BE(offset);
        offset += 4;

        const isValid = buffer.readUIntBE(offset, 1) === 1;
        offset += 1;

        const length = buffer.readUInt16BE(offset);
        offset += 2;

        if (isValid) {
          const { value } = this.deserialize(buffer, offset, this.schema);
          const parser = this.schema.safeParse(value);

          const parsedData = parser.data as z.infer<TSchema>;

          if (!isValidByteOffset && currentId === id) {
            isValidByteOffset = offset - 3;
          } else if (parser.success) {
            for (const key of this.uniques) {
              if (parsedData[key] === patch[key]) {
                return { ok: false, status: 409 };
              }
            }
          } else {
            return { ok: false, status: 509 };
          }
        }

        offset += length;
      }

      if (!isValidByteOffset) {
        return { ok: false, status: 404 };
      }

      // invalidate the old data
      buffer.writeUIntBE(0, isValidByteOffset, 1);

      const dataBuffer = this.create(id, patchData);
      const newBuffer = Buffer.concat([buffer, dataBuffer]);
      fs.writeFileSync(this.dataFilePath, newBuffer);

      return { ok: true, status: 200, data: { ...patchData, id } };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.createFile(0);
        return { ok: false, status: 404 };
      }

      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  /**
   * Deletes a record from the database file by marking it as invalid.
   *
   * @param {number} id The ID of the record to delete.
   * @returns {ActionResponse} A response object indicating success and status code.
   */
  public delete(id: number): ActionResponse {
    try {
      const buffer = fs.readFileSync(this.dataFilePath);

      const lastId = buffer.readUInt32BE();
      let offset = 4;

      if (id < 1 || id > lastId) return { ok: false, status: 404 };

      while (offset < buffer.length) {
        const currentId = buffer.readUInt32BE(offset);
        offset += 4;

        const isValid = buffer.readUIntBE(offset, 1) === 1;
        offset += 1;

        const length = buffer.readUInt16BE(offset);
        offset += 2;

        if (isValid && currentId === id) {
          // invalidate the data
          buffer.writeUIntBE(0, offset - 3, 1);

          fs.writeFileSync(this.dataFilePath, buffer);

          return { ok: true, status: 200, data: undefined };
        }

        offset += length;
      }

      return { ok: false, status: 404 };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.createFile(0);
        return { ok: false, status: 404 };
      }

      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  /**
   * Overloaded method to select records from the database.
   *
   * @param {number} id Selects a single record by its ID.
   * @returns {ActionResponse<z.infer<TSchema> & { id: number }>} A response object containing the found record.
   */
  public select(id: number): ActionResponse<z.infer<TSchema> & { id: number }>;

  /**
   * Overloaded method to select records from the database.
   *
   * @param {number[]} ids Selects multiple records by their IDs.
   * @returns {ActionResponse<((z.infer<TSchema> & { id: number }) | null)[]>} A response object containing an array of found records or null for those not found.
   */
  public select(
    ids: number[]
  ): ActionResponse<((z.infer<TSchema> & { id: number }) | null)[]>;

  /**
   * Overloaded method to select records from the database.
   *
   * @returns {ActionResponse<(z.infer<TSchema> & { id: number })[]>} Selects all valid records.
   */
  public select(): ActionResponse<(z.infer<TSchema> & { id: number })[]>;

  public select(
    target?: number | number[]
  ): ActionResponse<
    | ((z.infer<TSchema> & { id: number }) | null)[]
    | (z.infer<TSchema> & { id: number })
  > {
    try {
      const buffer = fs.readFileSync(this.dataFilePath);

      let foundInvalid = false;
      let offset = 4;

      if (Array.isArray(target)) {
        const results: ((z.infer<TSchema> & { id: number }) | null)[] =
          target.map(() => null);

        while (offset < buffer.length) {
          const id = buffer.readUInt32BE(offset);
          offset += 4;

          const isValid = buffer.readUIntBE(offset, 1) === 1;
          offset += 1;

          const length = buffer.readUInt16BE(offset);
          offset += 2;

          if (isValid && target.includes(id)) {
            const { value } = this.deserialize(buffer, offset, this.schema);

            const parser = this.schema.safeParse(value);

            if (parser.success) {
              const index = target.findIndex((key) => key === id);

              results[index] = { ...parser.data, id } as z.infer<TSchema> & {
                id: number;
              };

              if (!results.includes(null)) break;
            } else {
              foundInvalid = true;
            }
          }

          offset += length;
        }

        if (results.includes(null)) {
          return { ok: false, status: foundInvalid ? 509 : 404, data: results };
        }

        return { ok: true, status: foundInvalid ? 209 : 200, data: results };
      } else if (typeof target === "number") {
        const lastId = buffer.readUint32BE(0);
        if (target < 1 || target > lastId) return { ok: false, status: 404 };

        while (offset < buffer.length) {
          const id = buffer.readUInt32BE(offset);
          offset += 4;

          const isValid = buffer.readUIntBE(offset, 1) === 1;
          offset += 1;

          const length = buffer.readUInt16BE(offset);
          offset += 2;

          if (isValid && target === id) {
            const { value } = this.deserialize(buffer, offset, this.schema);

            const parser = this.schema.safeParse(value);

            if (parser.success) {
              return {
                ok: true,
                status: 200,
                data: { ...parser.data, id } as z.infer<TSchema> & {
                  id: number;
                },
              };
            } else {
              return { ok: false, status: 509 };
            }
          }

          offset += length;
        }
      } else {
        const results: (z.infer<TSchema> & { id: number })[] = [];

        while (offset < buffer.length) {
          const id = buffer.readUInt32BE(offset);
          offset += 4;

          const isValid = buffer.readUIntBE(offset, 1) === 1;
          offset += 1;

          const length = buffer.readUInt16BE(offset);
          offset += 2;

          if (isValid) {
            const { value } = this.deserialize(buffer, offset, this.schema);

            const parser = this.schema.safeParse(value);

            if (parser.success) {
              results.push({ ...parser.data, id } as z.infer<TSchema> & {
                id: number;
              });
            } else {
              foundInvalid = true;
            }
          }

          offset += length;
        }

        return { ok: true, status: foundInvalid ? 209 : 200, data: results };
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.createFile(0);
        return { ok: false, status: 404 };
      }

      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  /**
   * Creates a new database file and initializes the serial counter.
   *
   * @param {number} [serial] The starting value for the serial counter. Defaults to 0.
   * @private
   */
  private createFile(serial?: number) {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(serial || 0);

    fs.writeFileSync(this.dataFilePath, buffer);
  }

  /**
   * Increments the serial counter and writes the new value back to the file.
   *
   * @returns {number} The new serial ID.
   * @private
   */
  private serial(): number {
    try {
      const buffer = fs.readFileSync(this.dataFilePath);

      const lastId = buffer.readUInt32BE();
      const id = lastId + 1;

      buffer.writeUInt32BE(id);

      fs.writeFileSync(this.dataFilePath, buffer);

      return id;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.createFile(1);
        return 1;
      }
      throw error;
    }
  }

  /**
   * Creates a data record buffer for writing to the file.
   * This includes the ID, validity flag, payload length and the serialized data.
   *
   * @param {number} id The ID of the record.
   * @param {z.infer<TSchema>} data The data payload to serialize.
   * @returns {Buffer} The complete record buffer.
   * @private
   */
  private create(id: number, data: z.infer<TSchema>): Buffer {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32BE(id);

    const isValidBuffer = Buffer.alloc(1);
    isValidBuffer.writeUIntBE(1, 0, 1);

    const dataBuffer = this.serialize(this.schema, data);

    const lengthBuffer = Buffer.alloc(2);
    lengthBuffer.writeUInt16BE(dataBuffer.length);

    return Buffer.concat([idBuffer, isValidBuffer, lengthBuffer, dataBuffer]);
  }

  /**
   * Recursively serializes a JavaScript object into a binary Buffer based on its Zod schema.
   *
   * @param {z.ZodType} schema The Zod schema for the value to serialize.
   * @param {any} value The value to serialize.
   * @returns {Buffer} The serialized Buffer.
   * @private
   */
  private serialize(schema: z.ZodType, value: any): Buffer {
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
        numberBuffer.writeInt32BE(!value ? 2_147_483_647 : value * 100);
        return numberBuffer;

      case "bigint":
        const bigintBuffer = Buffer.alloc(8);
        bigintBuffer.writeBigInt64BE(
          !value ? BigInt("9223372036854775807") : value
        );
        return bigintBuffer;

      case "date":
        const dateBuffer = Buffer.alloc(4);
        dateBuffer.writeInt32BE(value ? new Date(value).getTime() : 0);
        return dateBuffer;

      case "string":
        const stringValue = value ? String(value) : "";
        const stringBuffer = Buffer.from(stringValue, "utf-8");

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
            arrayBuffer.push(this.serialize(arrayShape.element, element));
          }
        }

        return Buffer.concat(arrayBuffer);

      case "object":
        const objectShape = (schema as z.ZodObject).shape;
        const keys = Object.keys(objectShape);

        const objectBuffer: Buffer[] = [];

        for (const key of keys) {
          objectBuffer.push(this.serialize(objectShape[key], value[key]));
        }

        return Buffer.concat(objectBuffer);

      case "enum":
        const enumOptions = (schema as z.ZodEnum).options;

        const enumIndex = enumOptions.findIndex((element) => element === value);

        const enumBuffer = Buffer.alloc(1);
        enumBuffer.writeUIntBE(enumIndex, 0, 1);

        return enumBuffer;

      case "optional":
        return this.serialize(
          (schema as z.ZodOptional<z.ZodAny>).unwrap(),
          value
        );

      case "pipe":
        return this.serialize((schema as z.ZodPipe<z.ZodAny>).in, value);

      default:
        throw new Error(`Invalid type: ${schema.type}`);
    }
  }

  /**
   * Recursively deserializes a binary Buffer into a JavaScript object based on its Zod schema.
   *
   * @param {Buffer} buffer The buffer to deserialize from.
   * @param {number} offset The current offset in the buffer.
   * @param {z.ZodType} schema The Zod schema to guide deserialization.
   * @returns {{ offset: number; value: any }} An object containing the deserialized value and the new offset.
   * @private
   */
  private deserialize(
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
        const bigint = buffer.readBigInt64BE(offset);
        if (bigint !== BigInt("9223372036854775807")) value = bigint;
        bytesRead = 8;
        break;

      case "date":
        const date = buffer.readInt32BE(offset);
        if (date !== 0) value = new Date(date);
        bytesRead = 4;
        break;

      case "string":
        const stringLength = buffer.readUInt16BE(offset);
        bytesRead = 2;

        const string = buffer.toString(
          "utf-8",
          offset + bytesRead,
          offset + bytesRead + stringLength
        );

        if (string !== "") value = string;
        bytesRead += stringLength;
        break;

      case "array":
        const arrayShape = schema as z.ZodArray<z.ZodType>;

        const arrayLength = buffer.readUInt16BE(offset);
        bytesRead = 2;

        if (arrayLength !== 65_535) {
          const array = [];
          for (let i = 0; i < arrayLength; i++) {
            const { value: element, offset: elementOffset } = this.deserialize(
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
          const { value: propValue, offset: propOffset } = this.deserialize(
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
        const enumIndex = buffer.readUIntBE(offset, 1);

        value = enumOptions[enumIndex];
        bytesRead = 1;
        break;

      case "pipe":
        return this.deserialize(
          buffer,
          offset,
          (schema as z.ZodPipe<z.ZodAny>).in
        );

      case "optional":
        return this.deserialize(
          buffer,
          offset,
          (schema as z.ZodOptional<z.ZodAny>).unwrap()
        );

      default:
        throw new Error(`Invalid type: ${schema.type}`);
    }

    return { value, offset: offset + bytesRead };
  }
}
