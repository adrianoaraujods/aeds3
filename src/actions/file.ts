import * as fs from "fs";
import z from "zod";

import { BpTree } from "@/lib/bp-tree";

type FileConfig<TSchema extends z.ZodObject> = {
  name: string;
  dataSchema: TSchema;
  uniqueFields: (keyof z.infer<TSchema>)[];
  indexedFields?: (keyof z.infer<TSchema>)[];
};

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

    const indexedKeys = [...new Set([...uniqueFields, ...indexedFields])];

    for (const key of indexedKeys) {
      const tree = new BpTree(
        `./data/${name}.${String(key)}.index.db`,
        this.dataSchema.shape[String(key)]
      );

      this.indexes[String(key)] = tree;
    }
  }

  public insert(data: Omit<z.infer<TSchema>, "id">) {}

  public delete() {}

  public update(id: number, data: Omit<z.infer<TSchema>, "id">) {}

  public select(id: number) {}

  private initializeFile() {}

  private getSerial() {}
}
