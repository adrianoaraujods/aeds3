import * as fs from "fs";
import z from "zod";

import { BpTree } from "@/lib/bp-tree";
import { deserialize, serialize } from "@/lib/buffer";
import { ActionResponse, DATA_FOLDER_PATH } from "@/lib/config";

export class File<
  Schema extends z.ZodObject,
  PrimaryKey extends keyof z.infer<Schema>,
> {
  private readonly filePath: string;

  private readonly schema: Schema;

  private readonly primaryKey: PrimaryKey;
  private readonly uniqueFields: (keyof z.infer<Schema>)[];
  private readonly indexes: {
    [K in keyof z.infer<Schema>]?: BpTree<any>;
  } = {};

  constructor({
    name,
    schema,
    primaryKey,
    uniqueFields = [],
    indexedFields = [],
  }: {
    name: string;
    schema: Schema;
    primaryKey: PrimaryKey;
    uniqueFields?: (keyof z.infer<Schema>)[];
    indexedFields?: (keyof z.infer<Schema>)[];
  }) {
    this.filePath = DATA_FOLDER_PATH + name + ".db";
    this.uniqueFields = [...new Set([primaryKey, ...uniqueFields])];
    this.schema = schema;
    this.primaryKey = primaryKey;

    if (!fs.existsSync(this.filePath)) {
      this.createFile();
    }

    const indexedKeys = [...new Set([...this.uniqueFields, ...indexedFields])];

    for (const key of indexedKeys) {
      const tree = new BpTree(
        DATA_FOLDER_PATH + `indexes/${name}.${String(key)}.bpt`,
        this.schema.shape[String(key)]
      );

      this.indexes[key] = tree;
    }
  }

  public insert(data: unknown): ActionResponse<z.infer<Schema>> {
    let schema: z.ZodObject = this.schema;

    if (this.primaryKey === "id") {
      schema = schema.omit({ id: true });
    }

    const parser = schema.safeParse(data);

    if (!parser.success) return { ok: false, status: 400 };

    try {
      for (const uniqueField of this.uniqueFields) {
        if (uniqueField === "id") continue;

        const dataOffset = this.indexes[uniqueField]!.find(
          parser.data[String(uniqueField)]
        );

        if (dataOffset !== null) return { ok: false, status: 409 };
      }

      const record = {
        ...parser.data,
        id: this.primaryKey === "id" ? this.serial() : undefined,
      } as z.infer<Schema>;

      const recordOffset = this.append(record);

      for (const indexKey of Object.keys(this.indexes)) {
        this.indexes[indexKey]!.insert(record[indexKey], recordOffset);
      }

      return { ok: true, status: 201, data: record };
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  public delete(
    key: z.infer<Schema>[PrimaryKey]
  ): ActionResponse<z.infer<Schema>> {
    try {
      const recordOffset = this.indexes[this.primaryKey]!.find(key);
      if (!recordOffset) return { ok: false, status: 404 };

      const record = this.retrieve(recordOffset);
      if (!record) return { ok: false, status: 404 };

      this.invalidate(recordOffset);

      for (const indexKey of Object.keys(this.indexes)) {
        this.indexes[indexKey]!.delete(record[indexKey]);
      }

      return { ok: true, status: 200, data: record };
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  public update(data: z.infer<Schema>): ActionResponse<z.infer<Schema>> {
    const parser = this.schema.safeParse(data);

    if (!parser.success) return { ok: false, status: 400 };

    const updatedRecord = parser.data as z.infer<Schema>;

    try {
      const res = this.findBy(this.primaryKey, updatedRecord[this.primaryKey]);

      if (!res.ok) return res;

      const oldRecord = res.data;

      for (const uniqueField of this.uniqueFields) {
        if (uniqueField === this.primaryKey) continue;

        if (updatedRecord[uniqueField] === oldRecord[uniqueField]) continue;

        const dataOffset = this.indexes[uniqueField]!.find(
          updatedRecord[uniqueField]
        );

        if (dataOffset !== null) return { ok: false, status: 409 };
      }

      const updatedRecordOffset = this.append(data);

      for (const indexKey of Object.keys(this.indexes)) {
        this.indexes[indexKey]!.update(
          updatedRecord[indexKey],
          updatedRecordOffset
        );
      }

      return { ok: true, status: 200, data: updatedRecord };
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  public findBy<K extends keyof z.infer<Schema>>(
    key: K,
    value: z.infer<Schema>[K]
  ): ActionResponse<z.infer<Schema>> {
    try {
      const index = this.indexes[key];

      if (index) {
        const recordOffset = index.find(value);

        if (recordOffset === null) return { ok: false, status: 404 };

        const record = this.retrieve(recordOffset);

        if (!record) return { ok: false, status: 509 };

        return { ok: true, status: 200, data: record };
      }

      // TODO: find manually
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  public select<K extends keyof z.infer<Schema>>(
    key: K,
    value: z.infer<Schema>[K]
  ): ActionResponse<z.infer<Schema>[]> {
    try {
      const index = this.indexes[key];

      if (index) {
        const results = index.findRange(value, value);

        const records: z.infer<Schema>[] = [];

        for (const result of results) {
          const record = this.retrieve(result.value);

          if (record) records.push(record);
        }

        return { ok: true, status: 200, data: records };
      }

      // TODO: find manually
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }
  public getAll(): ActionResponse<z.infer<Schema>[]> {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r");

      const stats = fs.fstatSync(fd);
      const fileSize = stats.size;

      const records: z.infer<Schema>[] = [];

      // If primaryKey is "id", the first 4 bytes are the serial counter.
      // We skip them to start reading records.
      let offset = this.primaryKey === "id" ? 4 : 0;

      while (offset < fileSize) {
        // Read metadata: 1 byte (boolean) + 4 bytes (UInt32BE length) = 5 bytes
        const metaBuffer = Buffer.alloc(5);

        // Ensure we don't read past EOF
        if (offset + 5 > fileSize) break;

        fs.readSync(fd, metaBuffer, 0, 5, offset);

        const isValid = deserialize(metaBuffer, 0, z.boolean());
        const dataLength = metaBuffer.readUInt32BE(1);

        if (isValid) {
          const dataBuffer = Buffer.alloc(dataLength);
          fs.readSync(fd, dataBuffer, 0, dataLength, offset + 5);

          const { value } = deserialize(dataBuffer, 0, this.schema);
          records.push(value);
        }

        // Move offset to the next record (metadata size + data length)
        offset += 5 + dataLength;
      }

      return { ok: true, status: 200, data: records };
    } catch (error) {
      console.error(error);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }

    return { ok: false, status: 500 };
  }

  private createFile() {
    if (this.primaryKey === "id") {
      const serialBuffer = Buffer.alloc(4);
      serialBuffer.writeUint32BE(0);

      fs.writeFileSync(this.filePath, serialBuffer);
    } else {
      const buffer = Buffer.alloc(0);

      fs.writeFileSync(this.filePath, buffer);
    }
  }

  private serial(): number {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");

      const serialBuffer = Buffer.alloc(4);
      fs.readSync(fd, serialBuffer, 0, serialBuffer.length, 0);

      const prev = serialBuffer.readUInt32BE();

      const serial = prev + 1;
      serialBuffer.writeUint32BE(serial);

      fs.writeSync(fd, serialBuffer, 0, serialBuffer.length, 0);

      return serial;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  private toBuffer(data: z.infer<typeof this.schema>) {
    const isValidBuffer = serialize(true, z.boolean());

    const dataBuffer = serialize(data, this.schema);

    const dataLengthBuffer = Buffer.alloc(4);
    dataLengthBuffer.writeUInt32BE(dataBuffer.length);

    return Buffer.concat([isValidBuffer, dataLengthBuffer, dataBuffer]);
  }

  private append(data: z.infer<typeof this.schema>) {
    const buffer = this.toBuffer(data);

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "a");

      // gets the size of the file
      const { size: fileSize } = fs.fstatSync(fd);

      // append the node buffer to the file
      fs.writeSync(fd, buffer, 0, buffer.length, fileSize);

      return fileSize;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  private retrieve(offset: number): z.infer<Schema> | null {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r");

      const metaBuffer = Buffer.alloc(5);
      fs.readSync(fd, metaBuffer, 0, metaBuffer.length, offset);

      const isValid = deserialize(metaBuffer, 0, z.boolean());

      if (!isValid) return null;

      const dataLength = metaBuffer.readUInt32BE(1);

      const dataBuffer = Buffer.alloc(dataLength);
      fs.readSync(
        fd,
        dataBuffer,
        0,
        dataBuffer.length,
        offset + metaBuffer.length
      );

      const { value: data } = deserialize(dataBuffer, 0, this.schema);

      // will throw an error if the `data` is invalid
      return this.schema.parse(data) as z.infer<Schema>;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  private invalidate(offset: number) {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");

      const isValidBuffer = serialize(false, z.boolean());

      fs.writeSync(fd, isValidBuffer, 0, isValidBuffer.length, offset);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }
}
