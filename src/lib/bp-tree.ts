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
const MIN_KEYS = Math.ceil(B_PLUS_TREE_ORDER / 2) - 1;

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
      // Adding a default of 0 protects against reading old file structures
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
      const childPointerIndex = this.findIndex(currentNode.keys, key);

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
    const insertIndex = this.findIndex(currentNode.keys, key);
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
      const newKeyInsertIndex = this.findIndex(parentNode.keys, propagatedKey);

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
      const pointerIndex = this.findIndex(currentNode.keys, key);

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
   * Updates the record offset associated with an existing key.
   * This is an in-place update, avoiding file growth.
   * @param key The key value to update.
   * @param newRecordOffset The new file offset of the corresponding record.
   * @returns True if the key was found and updated, false otherwise.
   */
  public update(key: TKey, newRecordOffset: number): boolean {
    let currentOffset = this.rootOffset;
    let currentNode = this.readNode(currentOffset);

    // 1. Traverse to the correct leaf node, tracking its offset.
    while (!currentNode.isLeaf) {
      const pointerIndex = this.findIndex(currentNode.keys, key);
      currentOffset = currentNode.pointers[pointerIndex];
      currentNode = this.readNode(currentOffset);
    }

    // 2. Search the Leaf Node for an exact key match.
    const keyIndex = currentNode.keys.findIndex((k) => k === key);

    if (keyIndex === -1) {
      return false; // Key not found.
    }

    // 3. Update the pointer in memory.
    currentNode.pointers[keyIndex] = newRecordOffset;

    // 4. Overwrite the node data in place on disk.
    this.overwriteNode(currentNode, currentOffset);

    return true;
  }

  /**
   * Removes a key and its associated record offset from the B+ Tree.
   * @param key The key value to remove.
   * @returns True if removal was successful, false otherwise.
   */
  public remove(key: TKey): boolean {
    const initialRootOffset = this.rootOffset;
    const pathStack: StackEntry[] = [];

    let currentOffset = initialRootOffset;
    let currentNode = this.readNode(currentOffset);

    // 1. Traverse to the correct leaf node and build pathStack.
    while (!currentNode.isLeaf) {
      const childPointerIndex = this.findIndex(currentNode.keys, key);

      pathStack.push({
        parentOffset: currentOffset,
        childPointerIndex: childPointerIndex,
      });

      currentOffset = currentNode.pointers[childPointerIndex];
      currentNode = this.readNode(currentOffset);
    }

    // 2. Locate and delete the key in the leaf node.
    const keyIndex = currentNode.keys.findIndex((k) => k === key);
    if (keyIndex === -1) {
      return false; // Key not found.
    }

    // 2a. Remove the key and its record pointer.
    currentNode.keys.splice(keyIndex, 1);
    currentNode.pointers.splice(keyIndex, 1);

    // If the deleted key was the first key in the leaf, the parent's separator key might need updating.
    let needsKeyUpdate = keyIndex === 0 && pathStack.length > 0;

    // Flag to indicate if rebalancing (merge/redistribution) needs to propagate upwards.
    let needsRebalance = currentNode.keys.length < MIN_KEYS;

    // The current node is always rewritten (appended) after modification.
    let currentNodeOffset = this.writeNode(currentNode);

    // 3. Handle deletion propagation up the tree (bottom-up).
    while (needsKeyUpdate || needsRebalance) {
      if (pathStack.length === 0) {
        // If we reach the root and still need rebalance/update, it means only root shrinkage is possible.
        break;
      }

      const { parentOffset, childPointerIndex } = pathStack.pop()!;

      const parentNode = this.readNode(parentOffset);

      // Update the parent's pointer to the new version of the child.
      parentNode.pointers[childPointerIndex] = currentNodeOffset;

      // 3a. Handle Key Update (if first key in a leaf/child was deleted).
      if (needsKeyUpdate) {
        if (childPointerIndex > 0) {
          // Update the separator key in the parent to the new smallest key in the child.
          parentNode.keys[childPointerIndex - 1] = currentNode.keys[0];
        }
        // We stop key update propagation here.
        needsKeyUpdate = false;
      }

      // 3b. Handle Underflow (If child needs rebalancing).
      if (needsRebalance) {
        const sibInfo = this.getSiblingInfo(parentNode, childPointerIndex);

        let success = false;

        // Try Redistribution from Left Sibling
        if (sibInfo.leftSiblingOffset) {
          const leftSibling = this.readNode(sibInfo.leftSiblingOffset);
          if (leftSibling.keys.length > MIN_KEYS) {
            success = this.redistribute(
              parentNode,
              leftSibling,
              currentNode,
              sibInfo.leftSiblingIndex!,
              childPointerIndex
            );
          }
        }

        // Try Redistribution from Right Sibling
        if (!success && sibInfo.rightSiblingOffset) {
          const rightSibling = this.readNode(sibInfo.rightSiblingOffset);
          if (rightSibling.keys.length > MIN_KEYS) {
            success = this.redistribute(
              parentNode,
              currentNode,
              rightSibling,
              childPointerIndex,
              sibInfo.rightSiblingIndex!
            );
          }
        }

        if (success) {
          needsRebalance = false; // Problem solved, stop propagation.
        } else {
          // Need to Merge (with left sibling if possible, otherwise right).

          if (sibInfo.leftSiblingOffset) {
            // Merge current (right) into left sibling
            const leftSibling = this.readNode(sibInfo.leftSiblingOffset);
            currentNodeOffset = this.mergeNodes(
              parentNode,
              leftSibling,
              currentNode,
              sibInfo.leftSiblingIndex!,
              childPointerIndex
            );
          } else if (sibInfo.rightSiblingOffset) {
            // Merge right sibling into current (left)
            const rightSibling = this.readNode(sibInfo.rightSiblingOffset);
            currentNodeOffset = this.mergeNodes(
              parentNode,
              currentNode,
              rightSibling,
              childPointerIndex,
              sibInfo.rightSiblingIndex!
            );
          }

          // Parent's keys/pointers shrinked inside mergeNodes. Check if parent now underflows.
          needsRebalance =
            parentNode.keys.length < MIN_KEYS &&
            parentOffset !== initialRootOffset;
        }
      }

      // Crucial Fix: Rewrite the parent node to disk, as it was modified
      // (pointer update, key update, redistribution, or merge).
      const newParentOffset = this.writeNode(parentNode);

      // Continue climbing: the parent node becomes the new 'current' node for the next iteration.
      currentNodeOffset = newParentOffset;

      // FIX: Read the newly written parent node back from disk. This prevents using a stale in-memory reference.
      currentNode = this.readNode(currentNodeOffset);
    }

    // 4. Handle Root Shrinkage
    // Check if the root was the original root and is now an empty internal node.
    if (
      this.rootOffset === initialRootOffset &&
      !currentNode.isLeaf &&
      currentNode.keys.length === 0
    ) {
      // The old root merged its children and is now empty.
      const newRootOffset = currentNode.pointers[0];
      this.updateRootOffset(newRootOffset);
      return true;
    }

    // Final Root Offset Update:
    // If the root was rewritten (not split, not shrunk), update the offset.
    if (
      this.rootOffset === initialRootOffset &&
      currentNodeOffset !== initialRootOffset
    ) {
      this.updateRootOffset(currentNodeOffset);
    }

    return true;
  }

  /**
   * Finds the sibling information necessary for redistribution or merging.
   * @param parentNode The parent node.
   * @param childPointerIndex The index of the child node in the parent's pointers array.
   * @returns An object containing left/right sibling offsets/indices.
   */
  private getSiblingInfo(
    parentNode: Node<TKey>,
    childPointerIndex: number
  ): {
    leftSiblingOffset: number | null;
    rightSiblingOffset: number | null;
    leftSiblingIndex: number | null;
    rightSiblingIndex: number | null;
  } {
    const leftSiblingIndex =
      childPointerIndex > 0 ? childPointerIndex - 1 : null;
    const rightSiblingIndex =
      childPointerIndex < parentNode.pointers.length - 1
        ? childPointerIndex + 1
        : null;

    return {
      leftSiblingOffset:
        leftSiblingIndex !== null
          ? parentNode.pointers[leftSiblingIndex]
          : null,
      rightSiblingOffset:
        rightSiblingIndex !== null
          ? parentNode.pointers[rightSiblingIndex]
          : null,
      leftSiblingIndex,
      rightSiblingIndex,
    };
  }

  /**
   * Performs redistribution between two siblings and updates the parent.
   * @param parent The parent node (is modified and rewritten).
   * @param left The left sibling node (is modified and rewritten).
   * @param right The right sibling node (is modified and rewritten).
   * @param leftIndex The pointer index of the left sibling in the parent.
   * @param rightIndex The pointer index of the right sibling in the parent.
   * @returns True if redistribution was successful.
   */
  private redistribute(
    parent: Node<TKey>,
    left: Node<TKey>,
    right: Node<TKey>,
    leftIndex: number,
    rightIndex: number
  ): boolean {
    const separatorKeyIndex = leftIndex;

    // Determine if redistribution is possible from left to right or right to left
    const canRedistributeFromLeft =
      left.keys.length > MIN_KEYS && leftIndex < rightIndex;
    const canRedistributeFromRight =
      right.keys.length > MIN_KEYS && rightIndex > leftIndex;

    if (canRedistributeFromLeft) {
      if (left.isLeaf) {
        // Case 1: Leaf Redistribution (Left gives largest key)
        const keyToMove = left.keys.pop()!;
        const pointerToMove = left.pointers.pop()!;

        // Insert at the beginning of the right node.
        right.keys.unshift(keyToMove);
        right.pointers.unshift(pointerToMove);

        // Update the separator key in the parent (it must point to the new smallest key in the right node).
        parent.keys[separatorKeyIndex] = right.keys[0];
      } else {
        // Case 2: Internal Redistribution (Left gives largest pointer, Parent gives separator, Right receives pointer/key)
        const keyToMove = left.keys.pop()!; // Key from left
        const pointerToMove = left.pointers.pop()!; // Pointer from left
        const separatorKey = parent.keys[separatorKeyIndex]; // Key from parent

        // 1. Move separator key down to the right child.
        right.keys.unshift(separatorKey);
        right.pointers.unshift(pointerToMove); // New pointer on the far left of right child

        // 2. Move keyToMove (from left) up to the parent as the new separator.
        parent.keys[separatorKeyIndex] = keyToMove;
      }
    } else if (canRedistributeFromRight) {
      if (left.isLeaf) {
        // Case 3: Leaf Redistribution (Right gives smallest key)
        const keyToMove = right.keys.shift()!;
        const pointerToMove = right.pointers.shift()!;

        // Append to the left node.
        left.keys.push(keyToMove);
        left.pointers.push(pointerToMove);

        // Update the separator key in the parent (it must point to the new smallest key in the right node).
        parent.keys[separatorKeyIndex] = right.keys[0];
      } else {
        // Case 4: Internal Redistribution (Right gives smallest pointer, Parent gives separator, Left receives key/pointer)
        const keyToMove = right.keys.shift()!; // Key from right
        const pointerToMove = right.pointers.shift()!; // Pointer from right
        const separatorKey = parent.keys[separatorKeyIndex]; // Key from parent

        // 1. Move separator key down to the left child.
        left.keys.push(separatorKey);
        left.pointers.push(pointerToMove); // New pointer on the far right of left child

        // 2. Move keyToMove (from right) up to the parent as the new separator.
        parent.keys[separatorKeyIndex] = keyToMove;
      }
    } else {
      return false; // No redistribution possible
    }

    // Rewrite all modified nodes.
    this.writeNode(parent);
    this.writeNode(left);
    this.writeNode(right);

    return true;
  }

  /**
   * Merges two nodes (left and right) into one (the left node), updates the parent,
   * and returns the offset of the new merged node (which is the new version of the left node).
   * The right node pointer and separator key are deleted from the parent.
   */
  private mergeNodes(
    parent: Node<TKey>,
    left: Node<TKey>,
    right: Node<TKey>,
    leftIndex: number,
    rightIndex: number
  ): number {
    // Determine the index of the separator key in the parent.
    const separatorKeyIndex = leftIndex;

    if (left.isLeaf) {
      // Case 1: Leaf Merge

      // 1. Combine keys and pointers into the left node.
      left.keys.push(...right.keys);
      left.pointers.push(...right.pointers);

      // 2. Update leaf linkage: Left node now points to wherever the Right node pointed.
      left.nextLeafOffset = right.nextLeafOffset;

      // 3. Remove the separator key and the right pointer from the parent.
      parent.keys.splice(separatorKeyIndex, 1);
      parent.pointers.splice(rightIndex, 1); // Delete the pointer to the right node
    } else {
      // Case 2: Internal Merge

      // 1. Pull the separator key down from the parent.
      const separatorKey = parent.keys[separatorKeyIndex];
      left.keys.push(separatorKey);

      // 2. Combine keys and pointers from the right node.
      left.keys.push(...right.keys);
      left.pointers.push(...right.pointers);

      // 3. Remove the separator key and the right pointer from the parent.
      parent.keys.splice(separatorKeyIndex, 1);
      parent.pointers.splice(rightIndex, 1); // Delete the pointer to the right node
    }

    // Rewrite the merged node (left) and the updated parent.
    const newLeftOffset = this.writeNode(left);
    this.writeNode(parent);

    return newLeftOffset;
  }

  /**
   * Uses Binary Search to find the correct insertion index
   * @param keys The array of keys to be searched
   * @param key The key value to find the correct index position
   * @returns The correct index of `key` in the `keys` array (index of first key >= target key)
   */
  private findIndex(keys: TKey[], key: TKey): number {
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

  /**
   * Writes the serialized node buffer to the end of the file (append-only).
   * @param node The node to write.
   * @returns The offset where the node was written.
   */
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

  /**
   * Writes the serialized node buffer back to its original offset (in-place update).
   * This is safe for simple pointer updates where the node size does not change.
   * @param node The node to write.
   * @param offset The file offset to overwrite.
   */
  private overwriteNode(node: Node<TKey>, offset: number): void {
    const nodeBuffer = this.createNode(node);

    let fd: number | undefined;

    try {
      fd = fs.openSync(this.filePath, "r+");
      // Write the new buffer (including 2-byte length header) starting at the given offset.
      fs.writeSync(fd, nodeBuffer, 0, nodeBuffer.length, offset);
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
