import * as fs from "fs";
import z from "zod";

import { deserialize, serialize } from "@/lib/files";

type Node<TKey extends z.ZodType> = {
  isLeaf: boolean;
  keys: z.infer<TKey>[];
  pointers: number[];
  nextLeafOffset: number;
};

export class BpTree<TKey extends z.ZodType> {
  private readonly keySchema;
  private readonly nodeSchema;
  private readonly filePath;

  /** will be initialized in {@link initializeFile} or {@link loadRootOffset} */
  private rootOffset: number = 0;

  constructor(filePath: string, keySchema: TKey) {
    this.filePath = filePath;
    this.keySchema = keySchema;
    this.nodeSchema = z.object({
      isLeaf: z.boolean(),
      keys: z.array(keySchema),
      pointers: z.array(z.uint32()),
      nextLeafOffset: z.uint32(),
    });

    if (fs.existsSync(this.filePath)) {
      this.loadRootOffset();
    } else {
      this.initializeFile();
    }
  }

  public insert(key: z.infer<TKey>, value: number) {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    if (value < 0) throw new Error("Error: inserting value less than zero.");
  }

  public delete(key: z.infer<TKey>): boolean {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    try {
    } catch (error) {
      console.error(error);
    }

    return false;
  }

  public update(key: z.infer<TKey>): boolean {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    try {
    } catch (error) {
      console.error(error);
    }

    return false;
  }

  public find(key: z.infer<TKey>): number | null {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    try {
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  public findRange(
    startKey: z.infer<TKey>,
    endKey: z.infer<TKey>
  ): { key: z.infer<TKey>; offset: number }[] {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(startKey);
    this.keySchema.parse(endKey);

    const result: ReturnType<typeof this.findRange> = [];

    try {
    } catch (error) {
      console.error(error);
    }

    return result;
  }

  /**
   * Creates the initial root node writes it's offset to the first 4 bytes in the file and loads the {@link rootOffset}
   */
  private initializeFile() {
    // create the initial root node buffer
    const initialRootBuffer = this.serializeNode({
      isLeaf: true,
      keys: [],
      pointers: [],
      nextLeafOffset: 0,
    });

    // writes the offset to the initial root node
    const rootOffsetBuffer = Buffer.alloc(4);
    this.rootOffset = rootOffsetBuffer.length;
    rootOffsetBuffer.writeUInt32BE(this.rootOffset);

    // creates the file buffer
    const fileBuffer = Buffer.concat([rootOffsetBuffer, initialRootBuffer]);

    // writes the file buffer
    fs.writeFileSync(this.filePath, fileBuffer);
  }

  /**
   * Reads the first 4 bytes of the file and load the {@link rootOffset}
   */
  private loadRootOffset() {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r");

      const rootOffsetBuffer = Buffer.alloc(4);
      fs.readSync(fd, rootOffsetBuffer, 0, rootOffsetBuffer.length, 0);
      this.rootOffset = rootOffsetBuffer.readUInt32BE();
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  /**
   * Overwrites the first 4 bytes of the file with the root offset
   * @param newRootOffset The updated root offset that is going to be written
   */
  private updateRootOffset(newRootOffset: number) {
    const rootOffsetBuffer = Buffer.alloc(4);
    rootOffsetBuffer.writeUInt32BE(newRootOffset);

    let fd: number | undefined;

    try {
      // writes the new root offset
      fd = fs.openSync(this.filePath, "r+");
      fs.writeSync(fd, rootOffsetBuffer, 0, rootOffsetBuffer.length, 0);

      // updates the root offset
      this.rootOffset = newRootOffset;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  /**
   * Serializes a node and his length to a single buffer
   * @param node The node that is going to be serialized
   * @returns The buffer with the first 2 bytes for the node length followed by the serialized node
   */
  private serializeNode(node: Node<TKey>): Buffer {
    const nodeBuffer = serialize(node, this.nodeSchema);

    const lengthBuffer = Buffer.alloc(2);
    lengthBuffer.writeUInt16BE(nodeBuffer.length);

    return Buffer.concat([lengthBuffer, nodeBuffer]);
  }

  /**
   * Reads and deserializes a node from the file
   * @param position The position of the node in the file
   * @returns The deserialized node from the file
   */
  private deserializeNode(position: number): Node<TKey> {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r");

      // reads the length of the node
      const nodeLengthBuffer = Buffer.alloc(2);
      fs.readSync(fd, nodeLengthBuffer, 0, nodeLengthBuffer.length, position);
      const nodeLength = nodeLengthBuffer.readUInt16BE();

      // reads the node
      const nodeBuffer = Buffer.alloc(nodeLength);
      fs.readSync(
        fd,
        nodeBuffer,
        0,
        nodeBuffer.length,
        position + nodeLengthBuffer.length
      );

      const { value: node } = deserialize(nodeBuffer, 0, this.nodeSchema);

      // will throw an error if the `node` is invalid
      return this.nodeSchema.parse(node);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  /**
   * Appends a node to the end of the file
   * @param node The node that is going to be written
   * @returns The file position that the node was written
   */
  private appendNode(node: Node<TKey>): number {
    const nodeBuffer = this.serializeNode(node);

    let fd: number | undefined;

    try {
      // opens the file in the append-only mode
      fd = fs.openSync(this.filePath, "a");

      // gets the size of the file
      const { size: fileSize } = fs.fstatSync(fd);

      // append the node buffer to the file
      fs.writeSync(fd, nodeBuffer, 0, nodeBuffer.length, fileSize);

      return fileSize;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  /**
   * Overwrites a node with another one with the same size
   * @param node The new node with the exact same size that the one that is going to be overwritten
   * @param position The position of the old node
   */
  private overwriteNode(node: Node<TKey>, position: number) {
    const nodeBuffer = this.serializeNode(node);

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");

      // reads the length of the old node buffer
      const nodeLengthBuffer = Buffer.alloc(2);
      fs.readSync(fd, nodeLengthBuffer, 0, nodeLengthBuffer.length, position);
      const oldNodeBufferLength =
        nodeLengthBuffer.readUInt16BE() + nodeLengthBuffer.length;

      if (nodeBuffer.length !== oldNodeBufferLength) {
        throw new Error("Error: trying to overwrite a node of diffrent length");
      }

      // overwrites the old node data with the new one
      fs.writeSync(fd, nodeBuffer, 0, nodeBuffer.length, position);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }
}
