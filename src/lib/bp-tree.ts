import * as fs from "fs";
import { z } from "zod";

import { deserialize, serialize } from "@/lib/files";

type Node<T> = {
  isLeaf: boolean;
  keys: T[];
  pointers: number[];
  nextLeafOffset: number;
};

type StackEntry = {
  parentOffset: number;
  // The index in the parent's `pointers` array that points to the child node.
  childPointerIndex: number;
};

type Config<TSchema extends z.ZodType> = {
  filePath: string;
  keySchema: TSchema;
};

const B_PLUS_TREE_ORDER = 4; // 480;
const MAX_KEYS = B_PLUS_TREE_ORDER - 1;

export class BpTree<TSchema extends z.ZodType, TKey extends z.infer<TSchema>> {
  private readonly filePath: string;
  private readonly nodeSchema;

  private rootOffset: number;

  /**
   * Constructs an instance of the B+ Tree.
   * @param filePath The path to the index file (e.g., './data/users.id.index.db').
   * @param keySchema The Zod schema for the property being indexed.
   */
  constructor({ filePath, keySchema }: Config<TSchema>) {
    this.filePath = filePath;
    this.rootOffset = 0; // Will be read from the file or initialized

    this.nodeSchema = z.object({
      isLeaf: z.boolean(),
      keys: keySchema.array(),
      pointers: z.int32().min(0).array(),
      nextLeafOffset: z.int32().min(0),
    });

    if (fs.existsSync(this.filePath)) {
      this.loadRootOffset();
    } else {
      this.initializeFile();
    }
  }

  /**
   * Inserts a key and the offset to access the data file into the B+ Tree.
   * @param key The key value to index.
   * @param recordOffset The file offset of the corresponding record.
   */
  public insert(key: TKey, recordOffset: number) {
    const initialRootOffset = this.rootOffset;

    const pathStack: StackEntry[] = [];

    let currentOffset = initialRootOffset;
    let currentNode = this.readNode(currentOffset);

    // 1. Traverse to the correct leaf node.
    while (!currentNode.isLeaf) {
      // Find the index of the child pointer to follow.
      const childPointerIndex = this.findInsertIndex(currentNode.keys, key);

      // Record the current node (the parent) and the index of the pointer used.
      pathStack.push({
        parentOffset: currentOffset,
        childPointerIndex: childPointerIndex,
      });

      // Move to the child node.
      currentOffset = currentNode.pointers[childPointerIndex];
      currentNode = this.readNode(currentOffset);
    }

    // 2. Insert into the Leaf Node.
    const insertIndex = this.findInsertIndex(currentNode.keys, key);
    currentNode.keys.splice(insertIndex, 0, key);
    currentNode.pointers.splice(insertIndex, 0, recordOffset);

    // Variables to hold the result of a split, to be propagated up.
    let propagatedKey: TKey | null = null;
    let propagatedChildOffset: number | null = null;

    // The new offset of the current node after modification (new version is always appended).
    let currentNodeOffset = currentOffset;

    // This will hold the final offset to update the file header, if needed.
    let newRootOffsetCandidate: number = initialRootOffset;

    // 3. Check for Leaf Split.
    if (currentNode.keys.length > MAX_KEYS) {
      const { medianKey, newNode } = this.splitNode(currentNode);

      // Write the new (right) node to the file first, to get its offset.
      const newRightNodeOffset = this.writeNode(newNode);

      // The original (left) node's nextLeafOffset must now point to the new right node.
      currentNode.nextLeafOffset = newRightNodeOffset;

      // Write the modified current (left-hand) node to the file.
      currentNodeOffset = this.writeNode(currentNode);

      // Set the values to propagate to the parent.
      propagatedKey = medianKey;
      propagatedChildOffset = newRightNodeOffset;
    } else {
      // No split, just write the modified node (append new version).
      currentNodeOffset = this.writeNode(currentNode);
    }

    // If the leaf we just modified was the root, capture its new offset.
    if (initialRootOffset === currentOffset) {
      newRootOffsetCandidate = currentNodeOffset;
    }

    // 4. Propagate splits up the tree (from leaf to root).
    while (pathStack.length > 0) {
      const { parentOffset, childPointerIndex } = pathStack.pop()!;
      const parentNode = this.readNode(parentOffset);

      // Update the parent's pointer to the newly written version of the child.
      parentNode.pointers[childPointerIndex] = currentNodeOffset;

      if (propagatedKey === null) {
        // No split propagated from the child; the parent only needed a pointer update.
        currentNodeOffset = this.writeNode(parentNode);

        // If this parent was the original root, we have its new offset.
        if (parentOffset === initialRootOffset) {
          newRootOffsetCandidate = currentNodeOffset;
        }

        break; // Insertion and propagation finished.
      }

      // A split was propagated: insert the promoted key and the new child pointer.
      const newKeyInsertIndex = this.findInsertIndex(
        parentNode.keys,
        propagatedKey
      );

      // Insert the key and the pointer to the new right-hand child node.
      parentNode.keys.splice(newKeyInsertIndex, 0, propagatedKey);
      parentNode.pointers.splice(
        newKeyInsertIndex + 1,
        0,
        propagatedChildOffset!
      );

      // Reset propagation flags for the next level up.
      propagatedKey = null;
      propagatedChildOffset = null;

      // 5. Check for Internal Node Split.
      if (parentNode.keys.length > MAX_KEYS) {
        const { medianKey, newNode } = this.splitNode(parentNode);

        // Write the modified current (left-hand) node.
        currentNodeOffset = this.writeNode(parentNode);

        // Write the new right-hand node.
        const newRightNodeOffset = this.writeNode(newNode);

        // Set the values to propagate to the parent's parent.
        propagatedKey = medianKey;
        propagatedChildOffset = newRightNodeOffset;
      } else {
        // No split, just write the modified parent node.
        currentNodeOffset = this.writeNode(parentNode);

        // If this parent was the original root, we have its new offset.
        if (parentOffset === initialRootOffset) {
          newRootOffsetCandidate = currentNodeOffset;
        }

        break; // Propagation finished.
      }
      // If a split occurred, the loop continues to the next parent.
    }

    // 6. Root Split (Happens if propagation reaches the top and propagatedKey is NOT null).
    if (propagatedKey !== null) {
      const newRoot: Node<TKey> = {
        isLeaf: false,
        keys: [propagatedKey],
        pointers: [currentNodeOffset, propagatedChildOffset!], // Left child, Right child
        nextLeafOffset: 0,
      };

      newRootOffsetCandidate = this.writeNode(newRoot);
    }

    // Final Root Offset Update: Update the file header only if the root offset has changed.
    if (newRootOffsetCandidate !== initialRootOffset) {
      this.updateRootOffset(newRootOffsetCandidate);
    }
  }

  /**
   * Gets the `recordOffset` from the `key`.
   * @param key The key value to search.
   * @returns The Record Offset or null if the key is not found.
   */
  public get(key: TKey): number | null {
    let currentOffset = this.rootOffset;
    let currentNode = this.readNode(currentOffset);

    // 1. Traverse down to the correct leaf node.
    while (!currentNode.isLeaf) {
      // Find the index of the child pointer to follow.
      // The findInsertIndex logic correctly determines the pointer index P[i] such that
      // all keys in the target child are less than or equal to the search key K.
      const pointerIndex = this.findInsertIndex(currentNode.keys, key);

      // Move to the child node.
      currentOffset = currentNode.pointers[pointerIndex];
      currentNode = this.readNode(currentOffset);
    }

    // 2. Search the Leaf Node for an exact key match.
    const keyIndex = currentNode.keys.findIndex((k) => k === key);

    if (keyIndex < 0) return null;

    return currentNode.pointers[keyIndex];
  }

  /**
   * Uses Binary Search to find the correct insertion index
   * @param keys The array of keys to be searched
   * @param key The key value to find the correct index position
   * @returns The correct index of `key` in the `keys` array
   */
  private findInsertIndex(keys: TKey[], key: TKey): number {
    let low = 0;
    let high = keys.length - 1;
    let result = keys.length;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (key < keys[mid]) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return result;
  }

  /**
   * Splits an overflowing node into two nodes (left and right).
   * @param node The overflowing node (must have N keys).
   * @returns An object containing the median key (to be promoted) and the new right-hand node.
   */
  private splitNode(node: Node<TKey>): {
    medianKey: TKey;
    newNode: Node<TKey>;
  } {
    const midIndex = Math.floor(B_PLUS_TREE_ORDER / 2);

    let medianKey: TKey;
    let keysToKeep: TKey[];
    let pointersToKeep: number[];
    let newNode: Node<TKey>;

    if (node.isLeaf) {
      // Leaf split: The median key is promoted to the parent, but *also* kept in the new right leaf.
      medianKey = node.keys[midIndex];

      keysToKeep = node.keys.slice(0, midIndex);
      pointersToKeep = node.pointers.slice(0, midIndex);

      newNode = {
        isLeaf: true,
        keys: node.keys.slice(midIndex),
        pointers: node.pointers.slice(midIndex),
        // The new node inherits the current node's nextLeafOffset (maintaining the chain).
        nextLeafOffset: node.nextLeafOffset,
      };

      // The current (left) node's nextLeafOffset will be updated in `insert` after
      // the new node is written to disk and its offset is known.
    } else {
      // Internal split: The median key is promoted to the parent and *removed* from the children.
      medianKey = node.keys[midIndex];

      keysToKeep = node.keys.slice(0, midIndex);

      // Internal nodes have N pointers for N-1 keys. The pointer at midIndex points to the node whose keys are all less than the median key.
      pointersToKeep = node.pointers.slice(0, midIndex + 1);

      newNode = {
        isLeaf: false,
        keys: node.keys.slice(midIndex + 1), // Keys *after* the median go to the new node
        pointers: node.pointers.slice(midIndex + 1),
        nextLeafOffset: 0, // Not used for internal nodes
      };
    }

    // Update the current node's content (the left part).
    node.keys = keysToKeep;
    node.pointers = pointersToKeep;

    // If it was an internal node, reset nextLeafOffset to 0 for consistency, though it's unused.
    if (!node.isLeaf) node.nextLeafOffset = 0;

    return { medianKey, newNode };
  }

  private writeNode(node: Node<TKey>): number {
    const nodeBuffer = this.createNode(node);

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "a");

      // Get the size of the file
      const { size: offset } = fs.fstatSync(fd);

      // Append the node buffer
      fs.writeSync(fd, nodeBuffer, 0, nodeBuffer.length, offset);

      return offset;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  private updateRootOffset(newRootOffset: number): void {
    const rootOffsetBuffer = Buffer.alloc(4);
    rootOffsetBuffer.writeUInt32BE(newRootOffset);

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");
      fs.writeSync(fd, rootOffsetBuffer, 0, 4, 0);

      this.rootOffset = newRootOffset;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  private readNode(position: number): Node<TKey> {
    let fd: number;

    try {
      fd = fs.openSync(this.filePath, "r+");

      const nodeLengthBuffer = Buffer.alloc(2);
      fs.readSync(fd, nodeLengthBuffer, 0, 2, position);
      const nodeLength = nodeLengthBuffer.readUInt16BE();

      const nodeBuffer = Buffer.alloc(nodeLength);
      fs.readSync(fd, nodeBuffer, 0, nodeLength, position + 2);

      return this.deserializeNode(nodeBuffer);
    } finally {
      fs.closeSync(fd!);
    }
  }

  private createNode(node: Node<TKey>): Buffer {
    const nodeBuffer = this.serializeNode(node);

    const lengthBuffer = Buffer.alloc(2);
    lengthBuffer.writeUInt16BE(nodeBuffer.length);

    return Buffer.concat([lengthBuffer, nodeBuffer]);
  }

  private serializeNode(node: Node<TKey>): Buffer {
    return serialize(node, this.nodeSchema);
  }

  private deserializeNode(nodeBuffer: Buffer): Node<TKey> {
    const { value } = deserialize(nodeBuffer, 0, this.nodeSchema);

    return this.nodeSchema.parse(value) as Node<TKey>;
  }

  private loadRootOffset() {
    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");

      const rootOffsetBuffer = Buffer.alloc(4);
      fs.readSync(fd, rootOffsetBuffer, 0, 4, 0);

      const rootOffset = rootOffsetBuffer.readUInt32BE(0);
      this.rootOffset = rootOffset;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  private initializeFile() {
    const rootOffsetBuffer = Buffer.alloc(4);

    const initialRootBuffer = this.createNode({
      isLeaf: true,
      keys: [],
      pointers: [],
      nextLeafOffset: 0,
    });

    const rootOffset = rootOffsetBuffer.length;
    rootOffsetBuffer.writeUInt32BE(rootOffset);

    const fileBuffer = Buffer.concat([rootOffsetBuffer, initialRootBuffer]);

    fs.writeFileSync(this.filePath, fileBuffer);
    this.rootOffset = rootOffset;
  }
}
