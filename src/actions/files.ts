import * as fs from "fs";
import { z } from "zod";

import type { ActionResponse } from "@/lib/config";

type Config<TSchema extends z.ZodObject<any>> = {
  primaryKey: keyof z.infer<TSchema>;
  filePath: string;
  schema: TSchema;
  sizes: { [key in keyof z.infer<TSchema>]: number };
};

export class ByteFile<TSchema extends z.ZodObject<any>> {
  private readonly primaryKey;
  private readonly filePath;
  private readonly schema;
  private readonly sizes;

  constructor({ filePath, primaryKey, schema, sizes }: Config<TSchema>) {
    this.primaryKey = primaryKey;
    this.filePath = filePath;
    this.schema = schema;
    this.sizes = sizes;
  }

  public append(data: z.infer<TSchema>): ActionResponse<z.infer<TSchema>> {
    const parser = this.schema.safeParse(data);

    if (!parser.success) {
      return { ok: false, status: 400 };
    }

    try {
      const foundResponse = this.get(parser.data[this.primaryKey]);

      if (foundResponse.ok) {
        return { ok: false, status: 409 };
      } else if (foundResponse.status !== 404) {
        return { ok: false, status: foundResponse.status };
      }

      const buffer = this.serialize(parser.data, false);
      fs.appendFileSync(this.filePath, buffer);

      this.updateAmount(1);

      return { ok: true, status: 201, data: parser.data };
    } catch (error) {
      console.log(error);
    }

    return { ok: false, status: 500 };
  }

  public getAll(): ActionResponse<z.infer<TSchema>[]> {
    const results: z.infer<TSchema>[] = [];

    try {
      const buffer = fs.readFileSync(this.filePath);
      let offset = 0;

      const amount = buffer.readIntBE(offset, 4);
      offset += 4;

      let validCount = 0;
      while (offset < buffer.length) {
        const size = buffer.readIntBE(offset, 4);
        offset += 4;

        const isDead = buffer.readIntBE(offset, 1) === 1;
        offset += 1;

        if (!isDead) {
          const data = this.deserialize(buffer.subarray(offset, offset + size));
          const parsedData = this.schema.safeParse(data);

          if (parsedData.success) {
            results.push(parsedData.data);
            validCount++;
          } else {
            console.error(parsedData.error);
          }
        }

        offset += size;
      }

      return {
        ok: true,
        status: validCount === amount ? 200 : 209,
        data: results,
      };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.createFile();

        return { ok: true, status: 201, data: [] };
      }

      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  public get(
    key: z.infer<TSchema>[typeof this.primaryKey]
  ): ActionResponse<z.infer<TSchema>> {
    if (typeof key !== typeof this.primaryKey) {
      return { ok: false, status: 400 };
    }

    try {
      const buffer = fs.readFileSync(this.filePath);
      let offset = 0;

      const amount = buffer.readIntBE(offset, 4);
      offset += 4;

      let validCount = 0;
      while (offset < buffer.length) {
        const size = buffer.readIntBE(offset, 4);
        offset += 4;

        const isDead = buffer.readIntBE(offset, 1) === 1;
        offset += 1;

        if (!isDead) {
          const data = this.deserialize(buffer.subarray(offset, offset + size));
          const parser = this.schema.safeParse(data);

          if (parser.success) {
            if (data[this.primaryKey] === key) {
              return { ok: true, status: 200, data: parser.data };
            }

            validCount++;
          } else {
            console.error(parser.error);
          }
        }

        offset += size;
      }

      if (validCount === amount) {
        return { ok: false, status: 404 };
      }

      return { ok: false, status: 509 };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.createFile();

        return { ok: false, status: 404 };
      }

      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  // TODO
  public update(
    key: z.infer<TSchema>[typeof this.primaryKey],
    patch: z.infer<TSchema>
  ): ActionResponse<z.infer<TSchema>> {
    return { ok: false, status: 500 };
  }

  // TODO
  public delete(key: z.infer<TSchema>[typeof this.primaryKey]): ActionResponse {
    return { ok: false, status: 500 };
  }

  private createFile() {
    const buffer = Buffer.alloc(4);
    buffer.writeUintBE(0, 0, 4);

    fs.writeFileSync(this.filePath, buffer);
  }

  private getAmount() {
    const buffer = fs.readFileSync(this.filePath);
    const amount = buffer.readUIntBE(0, 4);

    return amount;
  }

  private updateAmount(diff: number) {
    const buffer = fs.readFileSync(this.filePath);
    const amount = buffer.readUIntBE(0, 4);

    buffer.writeUIntBE(amount + diff, 0, 4);

    fs.writeFileSync(this.filePath, buffer);
  }

  private serialize(data: z.infer<TSchema>, dead: boolean) {
    const shape = this.schema.shape;
    const keys = Object.keys(shape).filter((key) => key !== this.primaryKey);

    // Manage dead files
    const graveBuffer = Buffer.alloc(1);
    graveBuffer.writeIntBE(dead ? 1 : 0, 0, 1);
    const parts: Buffer[] = [graveBuffer];
    let totalSize = 1;

    // Create Primary key buffer
    const primaryKeyType = shape[this.primaryKey].def.type;
    const primaryKeySize = this.sizes[this.primaryKey];
    const primaryKeyValue = data[this.primaryKey];
    const buffer = Buffer.alloc(primaryKeySize);

    // Write Primary key buffer
    switch (primaryKeyType) {
      case "string":
        buffer.write(String(primaryKeyValue), "utf-8");

        break;
      case "number":
        buffer.writeIntBE(Number(primaryKeyValue), 0, primaryKeySize);

        break;
      default:
        throw new Error(`Unsupported type: ${primaryKeyType}`);
    }

    // Adds Primary key buffer
    parts.push(buffer);
    totalSize += primaryKeySize;

    // Creates missing keys buffers
    for (const key of keys) {
      const { type } = shape[key].def;
      const size = this.sizes[key];
      const value = data[key];

      switch (type) {
        case "string":
          const stringBuffer = Buffer.from(
            !value ? "\\" : (value as string),
            "utf-8"
          );

          const lengthBuffer = Buffer.alloc(size);
          lengthBuffer.writeUIntBE(stringBuffer.length, 0, size);

          parts.push(lengthBuffer, stringBuffer);
          totalSize += size + stringBuffer.length;

          break;
        case "number":
          const numberBuffer = Buffer.alloc(size);
          numberBuffer.writeUIntBE(Number(value) * 100, 0, size);
          parts.push(numberBuffer);
          totalSize += size;

          break;
        case "boolean":
          const booleanBuffer = Buffer.alloc(size);
          booleanBuffer.writeUIntBE(value ? 1 : 0, 0, size);
          parts.push(booleanBuffer);
          totalSize += size;

          break;
        case "enum":
          if (String(value).length != size) {
            throw new Error(`Enum of inconsistent size`);
          }

          const enumBuffer = Buffer.from(String(value), "utf-8");
          parts.push(enumBuffer);
          totalSize += size;

          break;
        default:
          throw new Error(`Unsupported type: ${type}`);
      }
    }

    // Saves the total size of the object
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUIntBE(totalSize, 0, 4);
    totalSize += 4;

    return Buffer.concat([sizeBuffer, ...parts], totalSize);
  }

  private deserialize(data: Buffer) {
    const shape = this.schema.shape;
    const keys = Object.keys(shape).filter((key) => key !== this.primaryKey);

    const result: Record<any, any> = {};
    let offset = 0;

    const primaryKeyType = shape[this.primaryKey].def.type;
    const primaryKeySize = this.sizes[this.primaryKey];

    // Write Primary key buffer
    switch (primaryKeyType) {
      case "string":
        result[this.primaryKey] = data.toString(
          "utf-8",
          offset,
          offset + primaryKeySize
        );

        break;
      case "number":
        result[this.primaryKey] = data.readIntBE(offset, primaryKeySize);

        break;
      default:
        throw new Error(`Unsupported type: ${primaryKeyType}`);
    }
    offset += primaryKeySize;

    for (const key of keys) {
      const { type } = shape[key].def;
      const size = this.sizes[key];

      switch (type) {
        case "string":
          const stringLength = data.readUIntBE(offset, size);
          offset += size;

          const string = data.toString("utf-8", offset, offset + stringLength);
          result[key] = string === "\\" ? "" : string;
          offset += stringLength;

          break;
        case "number":
          result[key] = data.readUIntBE(offset, size);
          offset += size / 100;

          break;
        case "boolean":
          result[key] = data.readUIntBE(offset, size) === 1;
          offset += size;

          break;
        case "enum":
          result[key] = data.toString("utf-8", offset, offset + size);
          offset += size;

          break;
        default:
          throw new Error(`Unsupported type: ${type}`);
      }
    }

    return result;
  }
}
