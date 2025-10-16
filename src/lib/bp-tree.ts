import * as fs from "fs";
import z from "zod";

import { deserialize, serialize } from "@/lib/files";

type Node<TKey extends z.ZodType> = {
  isLeaf: boolean;
  keys: z.infer<TKey>[];
  pointers: number[];
  nextLeafOffset: number;
};

const ORDER = 5; // 480
const MAX_KEYS = ORDER - 1;
const MIN_KEYS = Math.ceil(ORDER / 2) - 1;

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

  // TODO: fix bug when not inserting keys in order, breaks leafs linkage

  /**
   *
   * @param key
   * @param value
   * @returns
   */
  public insert(key: z.infer<TKey>, value: number) {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    if (value < 0) throw new Error("Error: inserting value less than zero.");

    // start the search from the root
    let currentOffset = this.rootOffset;
    let currentNode = this.deserializeNode(currentOffset);
    let pointerIndex = this.findIndex(currentNode.keys, key);

    /** The nodes offsets that was taken to find the correct leaf */
    const offsetsPath: number[] = [];

    /** The pointers indexes that was taken to find the correct leaf */
    const pointersPath: number[] = [];

    // searches the correct leaf node to insert
    while (!currentNode.isLeaf) {
      // records the path of the nodes traveled
      offsetsPath.push(currentOffset);
      pointersPath.push(pointerIndex);

      // move to the next node
      currentOffset = currentNode.pointers[pointerIndex];
      currentNode = this.deserializeNode(currentOffset);

      // find correct pointer to follow
      pointerIndex = this.findIndex(currentNode.keys, key);
    }

    if (pointerIndex > 0 && currentNode.keys[pointerIndex - 1] === key) {
      throw new Error(`Error: inserting duplicate key: \`${key}\``);
    }

    let currentKey = key;
    let currentPointer = value;

    do {
      // insert the key and value into the correct position in the current node
      currentNode.keys.splice(pointerIndex, 0, currentKey);
      currentNode.pointers.splice(pointerIndex + 1, 0, currentPointer); // error?

      const parentOffset = offsetsPath.pop();

      // check if the node has not overflown
      if (currentNode.keys.length <= MAX_KEYS) {
        currentOffset = this.appendNode(currentNode);

        // check if the node has no parent, so it is the root
        if (parentOffset === undefined) {
          // the node was the root, so update the root offset
          this.updateRootOffset(currentOffset);
          return;
        }

        // update the parent node to point to the correct updated node
        const parentNode = this.deserializeNode(parentOffset);
        pointerIndex = pointersPath.pop()!;
        parentNode.pointers[pointerIndex] = currentOffset;

        // overwrite the data of the parent node
        this.overwriteNode(parentNode, parentOffset);

        // check if the leaf is not the first
        if (pointerIndex > 0) {
          // update the previous node to point to the correct updated node
          const previousNodeOffset = parentNode.pointers[pointerIndex - 1];
          const previousNode = this.deserializeNode(previousNodeOffset);
          previousNode.nextLeafOffset = currentOffset;

          // overwrite the data of the previous node
          this.overwriteNode(previousNode, previousNodeOffset);
        }

        return;
      }

      // the node has overflown, so split the node
      // the current node will be updated to be the left node
      const [promotedKey, rightNodeOffset] = this.splitNode(
        currentNode,
        currentOffset
      );

      // check if the current node has no parent, so it is the root
      if (parentOffset === undefined) {
        // the current node is the root, so create a new root with the promoted key
        const newRootOffset = this.appendNode({
          isLeaf: false,
          keys: [promotedKey],
          pointers: [currentOffset, rightNodeOffset],
          nextLeafOffset: 0,
        });

        // the root has changed, so update the root offset
        this.updateRootOffset(newRootOffset);
        return;
      }

      // change the current node to it's parent
      currentOffset = parentOffset;
      currentNode = this.deserializeNode(currentOffset);

      // update the variables to iterate on the current node (parent node)
      currentKey = promotedKey;
      currentPointer = rightNodeOffset;
      pointerIndex = pointersPath.pop()!;
    } while (pointerIndex !== undefined);

    throw new Error(`Error: failed to promote key: \`${currentKey}\``);
  }

  public delete(key: z.infer<TKey>): boolean {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    // start the search from the root
    let currentOffset = this.rootOffset;
    let currentNode = this.deserializeNode(currentOffset);
    let pointerIndex = this.findIndex(currentNode.keys, key);

    /** The nodes offsets that was taken to find the correct leaf */
    const offsetsPath: number[] = [];

    /** The pointers indexes that was taken to find the correct leaf */
    const pointersPath: number[] = [];

    // searches the correct leaf node that could have the `key`
    while (!currentNode.isLeaf) {
      // records the path of the nodes traveled
      offsetsPath.push(currentOffset);
      pointersPath.push(pointerIndex);

      // move to the next node
      currentOffset = currentNode.pointers[pointerIndex];
      currentNode = this.deserializeNode(currentOffset);

      // find correct pointer to follow
      pointerIndex = this.findIndex(currentNode.keys, key);
    }

    // transform the insert index to the element index
    pointerIndex = Math.max(0, pointerIndex - 1);

    // check if the searched `key` is not present
    if (currentNode.keys[pointerIndex] !== key) return false;

    // removes the `key` and its value from the current node
    currentNode.keys.splice(pointerIndex, 1);
    currentNode.pointers.splice(pointerIndex, 1);

    const parentOffset = offsetsPath.pop();

    // check if the node has at least the minimum amount of keys
    if (currentNode.keys.length >= MIN_KEYS || parentOffset === undefined) {
      // overwrites the current node with the updated keys and values
      this.overwriteNode(currentNode, currentOffset);
      return true;
    }

    // the node did not have the minimum amount of keys

    const parentNode = this.deserializeNode(parentOffset);
    pointerIndex = pointersPath.pop()!;

    // TODO: wrong, the previous node could be from another parent
    // check if the previous node exists
    if (pointerIndex - 1 >= 0) {
      let previousNodeOffset = parentNode.pointers[pointerIndex - 1];
      let previousNode = this.deserializeNode(previousNodeOffset);

      // check if the previous node has enough space
      if (previousNode.keys.length + currentNode.keys.length <= MAX_KEYS) {
        // merges the previous node with the current node
        // updates the current node to the be result
        currentOffset = this.mergeNodes(previousNode, currentNode);
        currentNode = previousNode;

        // removes the pointer and the key to the old current node
        parentNode.pointers.splice(pointerIndex, 1);
        parentNode.keys.splice(pointerIndex - 1, 1);

        // updates the pointer to the new current node
        parentNode.pointers[pointerIndex - 1] = currentOffset;

        // overwrites the parent node with the changes
        this.overwriteNode(parentNode, parentOffset);

        // check if the previous node has another node pointing to it
        if (currentNode.isLeaf && pointerIndex - 1 > 0) {
          previousNodeOffset = parentNode.pointers[pointerIndex - 2];
          previousNode = this.deserializeNode(previousNodeOffset);

          // update the pointer to thee current node
          previousNode.nextLeafOffset = currentOffset;
          this.overwriteNode(previousNode, previousNodeOffset);
        }

        return true;
      }

      // the previous node is full, so take one key pointer pair from it
      const takenKey = previousNode.keys.pop()!;
      const takenPointer = previousNode.pointers.pop()!;
      this.overwriteNode(previousNode, previousNodeOffset);

      // place the key pointer pair in the first position of the current node
      currentNode.keys.splice(0, 0, takenKey);
      currentNode.pointers.splice(0, 0, takenPointer);
      this.overwriteNode(currentNode, currentOffset);

      // update the key in the parent to the first of the current node
      parentNode.keys[pointerIndex - 1] = currentNode.keys[0];
      this.overwriteNode(parentNode, parentOffset);

      return true;
    }

    // TODO: wrong, the next node could be from another parent
    // check if the next node exits
    if (pointerIndex + 1 < parentNode.pointers.length) {
      const nextNodeOffset = parentNode.pointers[pointerIndex + 1];
      const nextNode = this.deserializeNode(nextNodeOffset);

      // check if the next node has enough space
      if (nextNode.keys.length + currentNode.keys.length <= MAX_KEYS) {
        // merges the current node with the next node
        // updates the current node to the be result
        currentOffset = this.mergeNodes(currentNode, nextNode);

        // removes the pointer and the key to the next node
        parentNode.pointers.splice(pointerIndex + 1, 1);
        parentNode.keys.splice(pointerIndex, 1);

        // updates the pointer to the updated current node
        parentNode.pointers[pointerIndex] = currentOffset;

        // check if the current node has another node pointing to it
        if (currentNode.isLeaf && pointerIndex - 1 >= 0) {
          const previousNodeOffset = parentNode.pointers[pointerIndex - 1];
          const previousNode = this.deserializeNode(previousNodeOffset);

          // update the pointer to thee current node
          previousNode.nextLeafOffset = currentOffset;
          this.overwriteNode(previousNode, previousNodeOffset);

          // update the parent key to the first key in the current node
          parentNode.keys[pointerIndex - 1] = currentNode.keys[0];
        }

        // overwrites the parent node with the changes
        this.overwriteNode(parentNode, parentOffset);

        return true;
      }

      // the next node is full, so take one key pointer pair from it
      const takenKey = nextNode.keys.splice(0, 1)[0];
      const takenPointer = nextNode.pointers.splice(0, 1)[0];
      this.overwriteNode(nextNode, nextNodeOffset);

      // place the key pointer pair in the end of the current node
      currentNode.keys.push(takenKey);
      currentNode.pointers.push(takenPointer);
      this.overwriteNode(currentNode, currentOffset);

      // update the key in the parent to the first of the current node
      parentNode.keys[pointerIndex] = currentNode.keys[0];
      this.overwriteNode(parentNode, parentOffset);
    }

    // the current node has to be the root
    this.updateRootOffset(currentOffset);

    return false;
  }

  /**
   * Updates the `value` of a `key` in the tree
   * @param key The key that will have its value updated
   * @param value The new value that will be used to update
   * @returns if the key was found and updated
   */
  public update(key: z.infer<TKey>, value: number): boolean {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    // start the search from the root
    let currentOffset = this.rootOffset;
    let currentNode = this.deserializeNode(currentOffset);
    let pointerIndex = this.findIndex(currentNode.keys, key);

    // searches the correct leaf that could have the `key`
    while (!currentNode.isLeaf) {
      // move to the next node
      currentOffset = currentNode.pointers[pointerIndex];
      currentNode = this.deserializeNode(currentOffset);

      // find correct pointer to follow
      pointerIndex = this.findIndex(currentNode.keys, key);
    }

    // check if the searched `key` is present
    if (currentNode.keys[Math.max(0, pointerIndex - 1)] === key) {
      // updates the previous value with new `value`
      currentNode.pointers[Math.max(0, pointerIndex - 1)] = value;
      this.overwriteNode(currentNode, currentOffset);

      return true;
    }

    return false;
  }

  /**
   * Searches the tree for a specific key
   * @param key The searched key
   * @returns The value associated with the `key` or `null` if not found
   */
  public find(key: z.infer<TKey>): number | null {
    // will throw an error if the `key` is invalid
    this.keySchema.parse(key);

    // start the search from the root
    let currentOffset = this.rootOffset;
    let currentNode = this.deserializeNode(currentOffset);
    let pointerIndex = this.findIndex(currentNode.keys, key);

    // searches the correct leaf node to insert
    while (!currentNode.isLeaf) {
      // move to the next node
      currentOffset = currentNode.pointers[pointerIndex];
      currentNode = this.deserializeNode(currentOffset);

      // find correct pointer to follow
      pointerIndex = this.findIndex(currentNode.keys, key);
    }

    // check if the searched `key` is present
    if (currentNode.keys[Math.max(0, pointerIndex - 1)] === key) {
      return currentNode.pointers[Math.max(0, pointerIndex - 1)];
    }

    return null;
  }

  /**
   * Searches the tree for a specific range
   * @param startKey The first acceptable `key` (inclusive)
   * @param endKey The last acceptable `key` (inclusive)
   * @returns An array of objects containing the keys and values found in that range
   */
  public findRange(
    startKey: z.infer<TKey>,
    endKey: z.infer<TKey>
  ): { key: z.infer<TKey>; value: number }[] {
    // will throw an error if the `startKey` or `endKey` are invalid
    this.keySchema.parse(startKey);
    this.keySchema.parse(endKey);

    const results: ReturnType<typeof this.findRange> = [];

    if (startKey > endKey) {
      throw new Error(
        "Error: invalid range, starting key is greater than end key"
      );
    }

    // start the search from the root
    let currentOffset = this.rootOffset;
    let currentNode = this.deserializeNode(currentOffset);
    let pointerIndex = this.findIndex(currentNode.keys, startKey);

    // searches the leaf that could have the first key in the range
    while (!currentNode.isLeaf) {
      // move to the next node
      currentOffset = currentNode.pointers[pointerIndex];
      currentNode = this.deserializeNode(currentOffset);

      // find correct pointer to follow
      pointerIndex = this.findIndex(currentNode.keys, startKey);
    }

    // transform the insert index to the element index
    pointerIndex = Math.max(0, pointerIndex - 1);

    let currentKey = currentNode.keys[pointerIndex];
    let currentValue = currentNode.pointers[pointerIndex];

    // check if any key exists in the range
    if (currentKey < startKey) return results;

    while (currentKey <= endKey) {
      results.push({ key: currentKey, value: currentValue });

      // check if the leaf still have elements
      if (pointerIndex < currentNode.keys.length - 1) {
        // avances to the next element in the same leaf node
        pointerIndex++;
      } else if (currentNode.nextLeafOffset !== 0) {
        // the tree still have more leafs, so avances to the first element in the next leaf
        pointerIndex = 0;
        currentNode = this.deserializeNode(currentNode.nextLeafOffset);
      } else {
        // the current node is the last leaf
        break;
      }

      currentKey = currentNode.keys[pointerIndex];
      currentValue = currentNode.pointers[pointerIndex];
    }

    return results;
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

      if (nodeBuffer.length > oldNodeBufferLength) {
        throw new Error("Error: trying to overwrite a node with a larger node");
      }

      // overwrites the old node data with the new one
      fs.writeSync(fd, nodeBuffer, 0, nodeBuffer.length, position);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  /**
   * Uses Binary Search to find the correct insertion index
   * @param keys The array of keys to be searched
   * @param key The key value to find the correct index position
   * @returns The correct index of `key` in the `keys` array (index of first key >= target key)
   */
  private findIndex(keys: z.infer<TKey>[], key: z.infer<TKey>): number {
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
   * Splits an overflowing node into two. This method **mutates** the original `node` object to become the left half of the split.
   * @param node The overflowing node to split.
   * @param position The position of the node in the file.
   * @returns A tuple containing the `[promotedKey, rightNodeOffset]`.
   */
  private splitNode(
    node: Node<TKey>,
    position: number
  ): [z.infer<TKey>, number] {
    if (node.keys.length < MAX_KEYS) {
      throw new Error("Error: trying to split a node that is not full.");
    }

    const midIndex = Math.floor(ORDER / 2);

    const rightNode: Node<TKey> = {
      isLeaf: node.isLeaf,
      keys: [],
      pointers: [],
      nextLeafOffset: 0,
    };

    let promotedKey: z.infer<TKey>;

    if (node.isLeaf) {
      rightNode.keys = node.keys.splice(midIndex);
      rightNode.pointers = node.pointers.splice(midIndex);

      // promotes a copy of the first key of the right node
      promotedKey = rightNode.keys[0];
    } else {
      // leaves the promoted key in the left node
      rightNode.keys = node.keys.splice(midIndex + 1);
      rightNode.pointers = node.pointers.splice(midIndex + 1);

      // promotes the last key of the left node
      promotedKey = node.keys.pop()!;
    }

    const rightNodeOffset = this.appendNode(rightNode);

    if (node.isLeaf) {
      node.nextLeafOffset = rightNodeOffset;
    }

    this.overwriteNode(node, position);

    return [promotedKey, rightNodeOffset];
  }

  /**
   * Merges the `keys` and the `pointers` of two nodes. This modifies the original left node.
   * @param leftNode The node that will be modified by reciving the data from the `rightNode`
   * @param rightNode The node that have the data that will be used to merge
   * @returns The offset of the new offset of the mergedNode (leaf node)
   */
  private mergeNodes(leftNode: Node<TKey>, rightNode: Node<TKey>): number {
    if (leftNode.isLeaf !== rightNode.isLeaf) {
      throw new Error("Error: trying to merge a leaf node with a travel node");
    }

    // concatenates the elements to the left node
    leftNode.keys.push(...rightNode.keys);
    leftNode.pointers.push(...rightNode.pointers);

    leftNode.nextLeafOffset = rightNode.nextLeafOffset;

    return this.appendNode(leftNode);
  }
}
