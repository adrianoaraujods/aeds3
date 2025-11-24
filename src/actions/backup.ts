"use server";

import * as fs from "fs";
import z from "zod";

import { deserialize, serialize } from "@/lib/buffer";
import { DATA_FOLDER_PATH } from "@/lib/config";
import { Huffman } from "@/lib/huffman";
import { formatTime } from "@/lib/utils";
import { reindexAllDataFiles } from "@/actions/data";

import type { ActionResponse } from "@/lib/config";

type CompressionAlgorithm = "huffman" | "lzw";

export async function createBackup(
  algorithm: CompressionAlgorithm
): Promise<ActionResponse> {
  try {
    const filePath =
      DATA_FOLDER_PATH + "backups/" + formatTime(new Date()) + ".bkp";
    const dataFiles = fs
      .readdirSync(DATA_FOLDER_PATH)
      .filter((fileName) => fileName.includes(".db"));

    const backupFile: Buffer[] = [serialize(algorithm, z.string())];

    let originalSize = 0;
    let compressedSize = 0;

    if (algorithm === "huffman") {
      const huffman = new Huffman();

      for (const fileName of dataFiles) {
        const file = fs.readFileSync(DATA_FOLDER_PATH + fileName);
        const fileSize = fs.statSync(DATA_FOLDER_PATH + fileName).size;
        originalSize += fileSize;

        const dataBuffer = huffman.encode(file);
        const fileNameBuffer = serialize(fileName, z.string());
        const dataLengthBuffer = Buffer.alloc(4);
        dataLengthBuffer.writeUint32BE(dataBuffer.length);

        compressedSize += dataBuffer.length;

        backupFile.push(fileNameBuffer, dataLengthBuffer, dataBuffer);
      }
    } else {
      return { ok: false, status: 400, message: "Algoritmo não suportado" };
    }

    console.log("Total Data Size: ", originalSize);
    console.log("Total Backup Size: ", compressedSize);
    console.log(
      `Final Efficiency: ${((1 - compressedSize / originalSize) * 100).toFixed(2)}%`
    );

    const backupBuffer = Buffer.concat(backupFile);
    fs.writeFileSync(filePath, backupBuffer);

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);
    return { ok: false, status: 500 };
  }
}

export async function loadBackup(): Promise<ActionResponse> {
  try {
    const dataFiles = fs
      .readdirSync(DATA_FOLDER_PATH + "backups/")
      .filter((fileName) => fileName.includes(".bkp"));

    if (dataFiles.length === 0) {
      return {
        ok: false,
        status: 409,
        message: "Nenhum backup foi encontrado",
      };
    }

    const backupFileName = dataFiles.at(-1)!;
    const backupFileBuffer = fs.readFileSync(
      DATA_FOLDER_PATH + "backups/" + backupFileName
    );

    const deserializingAlgorithm = deserialize(backupFileBuffer, 0, z.string());
    const algorithm = deserializingAlgorithm.value as CompressionAlgorithm;
    let { offset } = deserializingAlgorithm;

    if (algorithm === "huffman") {
      const huffman = new Huffman();

      while (offset < backupFileBuffer.length) {
        const deserializingFileName = deserialize(
          backupFileBuffer,
          offset,
          z.string()
        );

        const fileName = deserializingFileName.value;
        offset = deserializingFileName.offset;

        const dataLength = backupFileBuffer.readUInt32BE(offset);
        offset += 4;

        const compressedBuffer = backupFileBuffer.subarray(
          offset,
          offset + dataLength
        );

        const dataBuffer = huffman.decode(compressedBuffer);
        fs.writeFileSync(DATA_FOLDER_PATH + fileName, dataBuffer);

        offset += dataLength;
      }
    } else {
      throw new Error("Error: unsupported algorithm.");
    }

    reindexAllDataFiles();

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);
    return { ok: false, status: 500 };
  }
}
