export class LZW {
  /**
   * Compresses a Buffer into an array of numbers.
   */
  public static compress(data: Buffer): Buffer {
    const dictionary = new Map<string, number>();

    // Initialize dictionary with single bytes (0-255)
    for (let i = 0; i < 256; i++) {
      dictionary.set(String.fromCharCode(i), i);
    }

    let nextCode = 256;
    const codes: number[] = []; // Temporary array to hold codes before packing
    let currentPhrase = "";

    for (let i = 0; i < data.length; i++) {
      const char = String.fromCharCode(data[i]);
      const newPhrase = currentPhrase + char;

      if (dictionary.has(newPhrase)) {
        currentPhrase = newPhrase;
      } else {
        codes.push(dictionary.get(currentPhrase)!);
        dictionary.set(newPhrase, nextCode++);
        currentPhrase = char;
      }
    }

    if (currentPhrase !== "") {
      codes.push(dictionary.get(currentPhrase)!);
    }

    const outputBuffer = Buffer.alloc(codes.length * 2);
    for (let i = 0; i < codes.length; i++) {
      // If nextCode exceeds 65535, this will throw.
      outputBuffer.writeUInt16BE(codes[i], i * 2);
    }

    return outputBuffer;
  }

  /**
   * Decompresses an array of numbers back into a Buffer.
   */
  public static decompress(compressedData: Buffer): Buffer {
    if (compressedData.length === 0) return Buffer.alloc(0);

    // Initialize dictionary
    const dictionary = new Map<number, Buffer>();
    for (let i = 0; i < 256; i++) {
      dictionary.set(i, Buffer.from([i]));
    }

    let nextCode = 256;
    const resultChunks: Buffer[] = [];

    // Read the first code (first 2 bytes)
    let previousCode = compressedData.readUInt16BE(0);
    const firstEntry = dictionary.get(previousCode);

    if (!firstEntry) throw new Error("Invalid start code");
    resultChunks.push(firstEntry);

    // Iterate 2 bytes at a time
    for (let i = 2; i < compressedData.length; i += 2) {
      const currentCode = compressedData.readUInt16BE(i);
      let entry: Buffer;

      if (dictionary.has(currentCode)) {
        entry = dictionary.get(currentCode)!;
      } else if (currentCode === nextCode) {
        const prevEntry = dictionary.get(previousCode)!;
        entry = Buffer.concat([prevEntry, prevEntry.subarray(0, 1)]);
      } else {
        throw new Error(`Invalid LZW code: ${currentCode}`);
      }

      resultChunks.push(entry);

      const prevEntry = dictionary.get(previousCode)!;
      const newSequence = Buffer.concat([prevEntry, entry.subarray(0, 1)]);

      dictionary.set(nextCode++, newSequence);
      previousCode = currentCode;
    }

    return Buffer.concat(resultChunks);
  }
}
