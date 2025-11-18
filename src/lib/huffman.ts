import { Queue } from "@/lib/queue";

class HuffmanNode {
  char: string | null;
  frequency: number;
  left: HuffmanNode | null;
  right: HuffmanNode | null;

  constructor(
    char: string | null,
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
  private encodingMap: Map<string, string> = new Map();
  private huffmanTreeRoot: HuffmanNode | null = null;

  encode(text: string): string {
    if (!text) return "";

    const frequencies = this.calculateFrequencies(text);
    this.huffmanTreeRoot = this.buildHuffmanTree(frequencies);
    this.generateCodes(this.huffmanTreeRoot, "");

    let encodedString = "";
    for (const char of text) {
      encodedString += this.encodingMap.get(char);
    }

    return encodedString;
  }

  decode(encodedText: string): string {
    if (!encodedText || !this.huffmanTreeRoot) return "";

    let decodedString = "";
    let currentNode = this.huffmanTreeRoot;

    for (const bit of encodedText) {
      if (bit === "0") {
        currentNode = currentNode!.left!;
      } else {
        currentNode = currentNode!.right!;
      }

      if (currentNode!.char !== null) {
        // Leaf node
        decodedString += currentNode!.char;
        currentNode = this.huffmanTreeRoot; // Reset to root for next character
      }
    }
    return decodedString;
  }

  private calculateFrequencies(text: string): Map<string, number> {
    const frequencies = new Map<string, number>();
    for (const char of text) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }
    return frequencies;
  }

  private buildHuffmanTree(frequencies: Map<string, number>): HuffmanNode {
    const pq = new Queue<HuffmanNode>((a, b) => a.frequency - b.frequency);

    for (const [char, freq] of frequencies.entries()) {
      pq.enqueue(new HuffmanNode(char, freq));
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
      this.encodingMap.set(node.char, currentCode);
      return;
    }

    this.generateCodes(node.left, currentCode + "0");
    this.generateCodes(node.right, currentCode + "1");
  }
}
