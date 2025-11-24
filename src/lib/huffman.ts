import { Queue } from "@/lib/queue";

class HuffmanNode {
  char: number | null;
  frequency: number;
  left: HuffmanNode | null;
  right: HuffmanNode | null;

  constructor(
    char: number | null,
    frequency: number,
    left: HuffmanNode | null = null,
    right: HuffmanNode | null = null
  ) {
    this.char = char;
    this.frequency = frequency;
    this.left = left;
    this.right = right;
  }
}

export class Huffman {
  private encodingMap: Map<number, string> = new Map();
  private huffmanTreeRoot: HuffmanNode | null = null;

  /**
   * Encodes a Buffer into a compressed Buffer.
   * Structure: [Header: Frequency Table] + [Metadata: Padding] + [Body: Compressed Bits]
   */
  public compress(data: Buffer): Buffer {
    if (data.length === 0) return Buffer.alloc(0);

    // 1. Calculate Frequencies
    const frequencies = this.calculateFrequencies(data);

    // 2. Build Tree and Code Map
    this.huffmanTreeRoot = this.buildHuffmanTree(frequencies);
    this.encodingMap.clear();
    this.generateCodes(this.huffmanTreeRoot, "");

    // 3. Bit Packing
    // We use an array of numbers (bytes) for dynamic growth, then convert to Buffer
    const packedData: number[] = [];
    let currentByte = 0;
    let bitCount = 0;

    for (const byte of data) {
      const code = this.encodingMap.get(byte);
      if (!code) continue;

      for (let i = 0; i < code.length; i++) {
        // Shift current byte left and add the new bit (0 or 1)
        currentByte = (currentByte << 1) | (code[i] === "1" ? 1 : 0);
        bitCount++;

        // If we have 8 bits, push to result and reset
        if (bitCount === 8) {
          packedData.push(currentByte);
          currentByte = 0;
          bitCount = 0;
        }
      }
    }

    // Handle remaining bits (padding)
    let padding = 0;
    if (bitCount > 0) {
      padding = 8 - bitCount;
      currentByte = currentByte << padding; // Shift remaining bits to the left
      packedData.push(currentByte);
    }

    // 4. Create Header (Serialize Frequency Table)
    // Format: [NumEntries(2 bytes)] -> [Byte(1 byte)][Freq(4 bytes)]...
    const freqEntries = Array.from(frequencies.entries());
    const headerSize = 2 + freqEntries.length * 5;
    const header = Buffer.alloc(headerSize);

    header.writeUInt16BE(freqEntries.length, 0); // Write number of entries

    let offset = 2;
    for (const [byte, freq] of freqEntries) {
      header.writeUInt8(byte, offset);
      header.writeUInt32BE(freq, offset + 1);
      offset += 5;
    }

    // 5. Combine: [Header] + [Padding Count (1 byte)] + [Packed Data]
    const paddingBuffer = Buffer.from([padding]);
    const bodyBuffer = Buffer.from(packedData);

    return Buffer.concat([header, paddingBuffer, bodyBuffer]);
  }

  public decompress(buffer: Buffer): Buffer {
    if (buffer.length === 0) return Buffer.alloc(0);

    // 1. Parse Header to Rebuild Tree
    let offset = 0;
    const numEntries = buffer.readUInt16BE(offset);
    offset += 2;

    const frequencies = new Map<number, number>();
    for (let i = 0; i < numEntries; i++) {
      const char = buffer.readUInt8(offset);
      const freq = buffer.readUInt32BE(offset + 1);
      frequencies.set(char, freq);
      offset += 5;
    }

    this.huffmanTreeRoot = this.buildHuffmanTree(frequencies);

    // 2. Read Padding
    const padding = buffer.readUInt8(offset);
    offset += 1;

    // 3. Decode Body
    const decodedBytes: number[] = [];
    let currentNode = this.huffmanTreeRoot;

    // Iterate through the remaining data bytes
    for (let i = offset; i < buffer.length; i++) {
      const byte = buffer[i];

      // Determine how many bits to read from this byte
      // If it's the last byte, ignore the padding bits at the end
      const bitsToRead = i === buffer.length - 1 ? 8 - padding : 8;

      // Process bits from left to right (MSB to LSB)
      for (let bit = 7; bit >= 8 - bitsToRead; bit--) {
        const isSet = (byte >> bit) & 1; // Check if bit at position 'bit' is 1

        if (isSet === 0) {
          currentNode = currentNode!.left!;
        } else {
          currentNode = currentNode!.right!;
        }

        if (currentNode!.char !== null) {
          // Leaf node found
          decodedBytes.push(currentNode!.char);
          currentNode = this.huffmanTreeRoot; // Reset to root
        }
      }
    }

    return Buffer.from(decodedBytes);
  }

  private calculateFrequencies(data: Buffer): Map<number, number> {
    const frequencies = new Map<number, number>();
    for (const byte of data) {
      frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }
    return frequencies;
  }

  private buildHuffmanTree(frequencies: Map<number, number>): HuffmanNode {
    const pq = new Queue<HuffmanNode>((a, b) => a.frequency - b.frequency);

    for (const [char, freq] of frequencies.entries()) {
      pq.enqueue(new HuffmanNode(char, freq));
    }

    // Edge case: If there's only 1 type of byte in the whole file
    if (pq.size() === 1) {
      const onlyNode = pq.dequeue()!;
      // Create a dummy parent so we can assign a code (e.g., "0")
      const dummyRoot = new HuffmanNode(
        null,
        onlyNode.frequency,
        onlyNode,
        null
      );
      return dummyRoot;
    }

    while (pq.size() > 1) {
      const node1 = pq.dequeue()!;
      const node2 = pq.dequeue()!;
      const mergedNode = new HuffmanNode(
        null,
        node1.frequency + node2.frequency,
        node1,
        node2
      );
      pq.enqueue(mergedNode);
    }

    return pq.dequeue()!;
  }

  private generateCodes(node: HuffmanNode | null, currentCode: string): void {
    if (!node) return;

    if (node.char !== null) {
      // Leaf node
      // If currentCode is empty (single character file case handled by dummy root above), default to "0"
      this.encodingMap.set(
        node.char,
        currentCode.length > 0 ? currentCode : "0"
      );
      return;
    }

    this.generateCodes(node.left, currentCode + "0");
    this.generateCodes(node.right, currentCode + "1");
  }
}
