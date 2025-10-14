import * as fs from "fs";
import z from "zod";

import { BpTree } from "@/lib/bp-tree";
import { ActionResponse } from "@/lib/config";
import { deserialize, serialize } from "@/lib/files";

type FileConfig<TSchema extends z.ZodObject> = {
  name: string;
  dataSchema: TSchema;
  uniqueFields: (keyof z.infer<TSchema>)[];
  indexedFields?: (keyof z.infer<TSchema>)[];
};

const MAX_ID = 21_474_836;

export class File<TSchema extends z.ZodObject> {
  private readonly dataFilePath: string;
  private readonly dataSchema: z.ZodObject;
  private readonly uniqueFields: (keyof z.infer<TSchema>)[];
  private readonly indexes: {
    [K in keyof z.infer<typeof this.dataSchema>]?: BpTree<any>;
  } & { id: BpTree<z.ZodUInt32> } = {} as { id: BpTree<z.ZodUInt32> };

  constructor({
    name,
    dataSchema,
    uniqueFields,
    indexedFields = [],
  }: FileConfig<TSchema>) {
    this.dataFilePath = `./data/${name}.db`;
    this.uniqueFields = [...new Set(["id", ...uniqueFields])];

    this.dataSchema = dataSchema.omit({ id: true }).extend({ id: z.uint32() });

    if (!fs.existsSync(this.dataFilePath)) {
      this.initializeFile();
    }

    const indexedKeys = [...new Set([...this.uniqueFields, ...indexedFields])];

    for (const key of indexedKeys) {
      const tree = new BpTree(
        `./data/${name}.${String(key)}.index.db`,
        this.dataSchema.shape[String(key)]
      );

      this.indexes[String(key)] = tree;
    }
  }

  public insert(
    data: Omit<z.infer<TSchema>, "id">
  ): ActionResponse<z.infer<TSchema>> {
    const parser = this.dataSchema.omit({ id: true }).safeParse(data);

    if (!parser.success) return { ok: false, status: 400 };

    try {
      for (const uniqueField of this.uniqueFields) {
        if (uniqueField === "id") continue;

        const dataOffset = this.indexes[String(uniqueField)]!.find(
          parser.data[String(uniqueField)]
        );

        if (dataOffset !== null) return { ok: false, status: 409 };
      }

      const record = { ...parser.data, id: this.serial() } as z.infer<TSchema>;

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

  public delete(id: number): ActionResponse<z.infer<TSchema>> {
    try {
      const { data: record } = this.select(id);

      if (!record) return { ok: false, status: 404 };

      for (const indexKey of Object.keys(this.indexes)) {
        this.indexes[indexKey]!.delete(record[indexKey]);
      }

      return { ok: true, status: 200, data: record };
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  public update(
    id: number,
    data: Omit<z.infer<TSchema>, "id">
  ): ActionResponse<z.infer<TSchema>> {
    const parser = this.dataSchema.safeParse({ id, ...data });

    if (!parser.success) return { ok: false, status: 400 };

    const updatedRecord = parser.data as z.infer<TSchema>;

    try {
      const { data: oldData } = this.select(id);

      if (!oldData) return { ok: false, status: 404 };

      for (const uniqueField of this.uniqueFields) {
        if (uniqueField === "id") continue;

        if (updatedRecord[uniqueField] === oldData[uniqueField]) continue;

        const dataOffset = this.indexes[String(uniqueField)]!.find(
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

  public select(id: number): ActionResponse<z.infer<TSchema>> {
    try {
      const recordOffset = this.indexes.id.find(id);

      if (!recordOffset) return { ok: false, status: 404 };

      const data = this.retrieve(recordOffset);

      return { ok: true, status: 200, data };
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  public getAll(): ActionResponse<z.infer<TSchema>[]> {
    try {
      const results = this.indexes.id.findRange(0, MAX_ID);

      const records: z.infer<TSchema>[] = [];

      for (const { value: recordOffset } of results) {
        records.push(this.retrieve(recordOffset));
      }

      return { ok: true, status: 200, data: records };
    } catch (error) {
      console.error(error);
    }

    return { ok: false, status: 500 };
  }

  private initializeFile() {
    const serialBuffer = Buffer.alloc(4);
    serialBuffer.writeUint32BE(0);

    fs.writeFileSync(this.dataFilePath, serialBuffer);
  }

  private serial(): number {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.dataFilePath, "r+");

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

  private append(data: z.infer<typeof this.dataSchema>) {
    const dataBuffer = serialize(data, this.dataSchema);

    const dataLengthBuffer = Buffer.alloc(2);
    dataLengthBuffer.writeUInt16BE(dataBuffer.length);

    const buffer = Buffer.concat([dataLengthBuffer, dataBuffer]);

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.dataFilePath, "a");

      // gets the size of the file
      const { size: fileSize } = fs.fstatSync(fd);

      // append the node buffer to the file
      fs.writeSync(fd, buffer, 0, buffer.length, fileSize);

      return fileSize;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  private retrieve(offset: number): z.infer<TSchema> {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.dataFilePath, "r");

      const dataLengthBuffer = Buffer.alloc(2);
      fs.readSync(fd, dataLengthBuffer, 0, dataLengthBuffer.length, offset);
      const dataLength = dataLengthBuffer.readUInt16BE();

      const dataBuffer = Buffer.alloc(dataLength);
      fs.readSync(
        fd,
        dataBuffer,
        0,
        dataBuffer.length,
        offset + dataLengthBuffer.length
      );

      const { value: data } = deserialize(dataBuffer, 0, this.dataSchema);

      // will throw an error if the `data` is invalid
      return this.dataSchema.parse(data) as z.infer<TSchema>;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }
}
