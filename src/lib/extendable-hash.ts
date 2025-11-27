import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

import { deserialize, getLength, serialize } from "@/lib/buffer";

const INITIAL_DEPTH = 1;
const MAX_DEPTH = 16;

const DEPTH_SIZE = 1;
const BUCKET_HEADER_SIZE = DEPTH_SIZE + 2;

type Pair<TKey extends z.ZodType> = { key: z.infer<TKey>; value: number };
type Bucket<TKey extends z.ZodType> = {
  localDepth: number;
  pairs: Pair<TKey>[];
};

class DirectoryFile<TKey extends z.ZodType> {
  private globalDepth = INITIAL_DEPTH;
  private directory: number[] = [];

  constructor(
    private readonly filePath: string,
    private readonly keySchema: TKey
  ) {
    if (!fs.existsSync(this.filePath)) {
      this.createFile();
    } else {
      this.readFile();
    }
  }

  public fullHash(key: z.infer<TKey>): bigint {
    const keyBuffer = serialize(key, this.keySchema);

    // Initial seed
    let hash: bigint = BigInt("0xcbf29ce484222325"); // FNV-1a 64-bit offset basis
    const prime = BigInt("0x100000001b3"); // FNV-1a 64-bit prime

    // This is a 64-bit mask (0xFFFFFFFFFFFFFFFFn)
    const MASK_64BIT = (BigInt(1) << BigInt(64)) - BigInt(1);

    for (const byte of keyBuffer) {
      hash = hash ^ BigInt(byte);
      hash = (hash * prime) & MASK_64BIT;
    }

    // Avalanche / Finalizer step
    // This spreads the entropy to high bits, ensuring MSB hashing works efficiently
    // even for small inputs.
    hash = (hash ^ (hash >> BigInt(33))) & MASK_64BIT;
    hash = (hash * BigInt("0xff51afd7ed558ccd")) & MASK_64BIT;
    hash = (hash ^ (hash >> BigInt(33))) & MASK_64BIT;
    hash = (hash * BigInt("0xc4ceb9fe1a85ec53")) & MASK_64BIT;
    hash = (hash ^ (hash >> BigInt(33))) & MASK_64BIT;

    return hash;
  }

  public hash(key: z.infer<TKey>): number {
    const hash = this.fullHash(key);

    const bitsToShift = 64 - this.globalDepth;
    const indexBigInt = hash >> BigInt(bitsToShift);

    return Number(indexBigInt);
  }

  public at(index: number): number {
    return this.directory[index];
  }

  public update(index: number, bucketOffset: number) {
    this.directory[index] = bucketOffset;

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");

      const bucketOffsetBuffer = Buffer.alloc(4);
      bucketOffsetBuffer.writeUInt32BE(bucketOffset);

      const offset = DEPTH_SIZE + index * bucketOffsetBuffer.length;

      fs.writeSync(
        fd,
        bucketOffsetBuffer,
        0,
        bucketOffsetBuffer.length,
        offset
      );
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  public increaseCapacity() {
    if (this.globalDepth >= MAX_DEPTH) {
      throw new Error(
        `Cannot increase directory capacity: Max depth (${MAX_DEPTH}) reached.`
      );
    }

    const oldSize = this.directory.length;
    const newDirectory = new Array(oldSize * 2);

    for (let i = 0; i < oldSize; i++) {
      const offset = this.directory[i];
      newDirectory[2 * i] = offset;
      newDirectory[2 * i + 1] = offset;
    }

    this.directory = newDirectory;
    this.globalDepth++;

    this.saveFile();
  }

  public getGlobalDepth() {
    return this.globalDepth;
  }

  private createFile() {
    const globalDepthBuffer = Buffer.alloc(1);
    globalDepthBuffer.writeUInt8(this.globalDepth);

    const pointersBuffer = Buffer.alloc(Math.pow(2, this.globalDepth) * 4);

    const directoryBuffer = Buffer.concat([globalDepthBuffer, pointersBuffer]);

    fs.writeFileSync(this.filePath, directoryBuffer);

    this.directory = new Array(Math.pow(2, this.globalDepth)).fill(0);
  }

  private readFile() {
    const fileBuffer = fs.readFileSync(this.filePath);
    this.globalDepth = fileBuffer.readUInt8();

    this.directory = []; // Reset directory array
    for (let offset = 1; offset < fileBuffer.length; offset += 4) {
      this.directory.push(fileBuffer.readUInt32BE(offset));
    }
  }

  private saveFile() {
    const fileBuffer = Buffer.alloc(1 + this.directory.length * 4);
    fileBuffer.writeUInt8(this.globalDepth);

    for (let i = 0, offset = 1; offset < fileBuffer.length; offset += 4, i++) {
      fileBuffer.writeUInt32BE(this.directory[i], offset);
    }

    fs.writeFileSync(this.filePath, fileBuffer);
  }
}

class BucketsFile<TKey extends z.ZodType> {
  private readonly blockSize;

  private readonly pairSchema;
  private readonly pairLength;

  public readonly bucketLength;

  constructor(
    private readonly filePath: string,
    private readonly keySchema: TKey
  ) {
    const fileExists = fs.existsSync(this.filePath);

    if (!fileExists) this.createFile();

    this.blockSize = fs.statSync(this.filePath).blksize || 4096;

    this.pairSchema = z.object({ key: keySchema, value: z.uint32() });

    this.pairLength = getLength(this.pairSchema);

    this.bucketLength = Math.floor(
      (this.blockSize - BUCKET_HEADER_SIZE) / this.pairLength
    );

    if (!fileExists) this.initializeBuckets();
  }

  public readBucket(offset: number): Bucket<TKey> {
    const bucket: Bucket<TKey> = { localDepth: INITIAL_DEPTH, pairs: [] };

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r");

      const bucketBuffer = Buffer.alloc(this.blockSize);
      fs.readSync(fd, bucketBuffer, 0, bucketBuffer.length, offset);

      bucket.localDepth = bucketBuffer.readUInt8();

      bucket.pairs = deserialize(
        bucketBuffer,
        // skip the local depth byte
        DEPTH_SIZE,
        z.array(this.pairSchema)
      ).value;

      return bucket;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  public writeBucket(offset: number, bucket: Bucket<TKey>) {
    if (bucket.pairs.length > this.bucketLength) {
      throw new Error(
        "Trying to write a bucket with more that the limit key, value pairs."
      );
    }

    const bucketBuffer = Buffer.alloc(this.blockSize);
    bucketBuffer.writeUInt8(bucket.localDepth);

    const filledBuffer = serialize(bucket.pairs, z.array(this.pairSchema));
    bucketBuffer.set(filledBuffer, DEPTH_SIZE);

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");

      fs.writeSync(fd, bucketBuffer, 0, bucketBuffer.length, offset);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  public createBucket(bucket: Bucket<TKey>) {
    const { size: fileSize } = fs.statSync(this.filePath);

    this.writeBucket(fileSize, bucket);

    return fileSize;
  }

  private createFile() {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(this.filePath, Buffer.alloc(0));
  }

  private initializeBuckets() {
    const initialBuckets = Math.pow(2, INITIAL_DEPTH);

    for (let i = 0; i < initialBuckets; i++) {
      this.createBucket({
        localDepth: INITIAL_DEPTH,
        pairs: [],
      });
    }
  }
}

export class ExtendableHash<TKey extends z.ZodType> {
  private directory: DirectoryFile<TKey>;
  private buckets: BucketsFile<TKey>;

  constructor(
    private readonly directoryPath: string,
    private readonly bucketsPath: string,
    private readonly keySchema: TKey
  ) {
    if (keySchema.type === "string") {
      const { maxLength } = keySchema as unknown as z.ZodString;

      if (!maxLength)
        throw new Error(
          "Cannot create a extendible hash with string keys of variable length."
        );
    }

    this.buckets = new BucketsFile(this.bucketsPath, this.keySchema);
    this.directory = new DirectoryFile(this.directoryPath, this.keySchema);
  }

  public insert(key: z.infer<TKey>, value: number) {
    const directoryIndex = this.directory.hash(key);
    const bucketOffset = this.directory.at(directoryIndex);

    const bucket = this.buckets.readBucket(bucketOffset);
    const bucketIndex = this.findIndex(bucket.pairs, key);

    if (
      bucketIndex < bucket.pairs.length &&
      bucket.pairs[bucketIndex].key === key
    ) {
      throw new Error(`Inserting duplicate key: '${key}'`);
    }

    bucket.pairs.splice(bucketIndex, 0, { key, value });

    if (bucket.pairs.length > this.buckets.bucketLength) {
      this.splitBucket(bucket, bucketOffset);
      return;
    }

    this.buckets.writeBucket(bucketOffset, bucket);
  }

  public find(key: z.infer<TKey>): number | null {
    const { bucket } = this.findBucket(key);

    const bucketIndex = this.findIndex(bucket.pairs, key);

    if (
      bucketIndex < 0 ||
      bucketIndex >= bucket.pairs.length ||
      bucket.pairs[bucketIndex].key !== key
    ) {
      return null;
    }

    return bucket.pairs[bucketIndex].value;
  }

  public remove(key: z.infer<TKey>) {
    const { bucket, bucketOffset } = this.findBucket(key);

    const bucketIndex = this.findIndex(bucket.pairs, key);

    if (
      bucketIndex < 0 ||
      bucketIndex >= bucket.pairs.length ||
      bucket.pairs[bucketIndex].key !== key
    ) {
      throw new Error(`Removing not found key: ${key}`);
    }

    bucket.pairs.splice(bucketIndex, 1);
    this.buckets.writeBucket(bucketOffset, bucket);
  }

  public update(key: z.infer<TKey>, value: number) {
    const { bucket, bucketOffset } = this.findBucket(key);

    const bucketIndex = this.findIndex(bucket.pairs, key);

    if (
      bucketIndex < 0 ||
      bucketIndex >= bucket.pairs.length ||
      bucket.pairs[bucketIndex].key !== key
    ) {
      throw new Error(`Updating not found key: ${key}`);
    }

    bucket.pairs[bucketIndex].value = value;
    this.buckets.writeBucket(bucketOffset, bucket);
  }

  private findIndex(pairs: Pair<TKey>[], key: z.infer<TKey>): number {
    const index = pairs.findIndex((pair) => pair.key >= key);

    if (index === -1) {
      return pairs.length;
    }

    return index;
  }

  private findBucket(key: z.infer<TKey>): {
    bucket: Bucket<TKey>;
    bucketOffset: number;
  } {
    const directoryIndex = this.directory.hash(key);
    const bucketOffset = this.directory.at(directoryIndex);

    const bucket = this.buckets.readBucket(bucketOffset);

    return { bucket, bucketOffset };
  }

  /**
   * Splits an overflowing bucket into two and updates the directory.
   */
  private splitBucket(bucket: Bucket<TKey>, bucketOffset: number) {
    if (bucket.localDepth === this.directory.getGlobalDepth()) {
      this.directory.increaseCapacity();
    }

    const newLocalDepth = bucket.localDepth + 1;

    const keepPairs: Pair<TKey>[] = [];
    const movePairs: Pair<TKey>[] = [];

    // Redistribute items based on the bit at the new local depth
    // The bit we care about is at index `newLocalDepth` (1-based from MSB in the concept,
    // but calculation depends on bitwise logic).
    // FNV-1a is 64-bit.
    // Depth 1 considers MSB (bit 63). Depth 2 considers bit 62.
    // The bit to check is: 64 - newLocalDepth.
    const bitCheckShift = BigInt(64 - newLocalDepth);

    for (const pair of bucket.pairs) {
      const fullHash = this.directory.fullHash(pair.key);
      const bit = (fullHash >> bitCheckShift) & BigInt(1);

      if (bit === BigInt(1)) {
        movePairs.push(pair);
      } else {
        keepPairs.push(pair);
      }
    }

    const updatedOldBucket: Bucket<TKey> = {
      localDepth: newLocalDepth,
      pairs: keepPairs,
    };
    this.buckets.writeBucket(bucketOffset, updatedOldBucket);

    const newBucket: Bucket<TKey> = {
      localDepth: newLocalDepth,
      pairs: movePairs,
    };
    const newBucketOffset = this.buckets.createBucket(newBucket);

    // 6. Update Directory Pointers
    // We iterate through the directory to find pointers that point to the old bucketOffset.
    // If the index's relevant bit (at newLocalDepth) is 1, we point it to the new bucket.
    const globalDepth = this.directory.getGlobalDepth();
    const directorySize = Math.pow(2, globalDepth);

    // Optimization: We verify which bit differentiates the split at the Global level.
    // The bit index in the *directory index* is `globalDepth - newLocalDepth`.
    const dirBitCheckShift = globalDepth - newLocalDepth;

    for (let i = 0; i < directorySize; i++) {
      if (this.directory.at(i) !== bucketOffset) continue;

      if ((i >> dirBitCheckShift) & 1) {
        this.directory.update(i, newBucketOffset);
      }
    }
  }
}
