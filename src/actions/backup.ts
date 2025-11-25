"use server";

import * as fs from "fs";
import z from "zod";

import { deserialize, serialize } from "@/lib/buffer";
import { DATA_FOLDER_PATH } from "@/lib/config";
import { Huffman } from "@/lib/huffman";
import { LZW } from "@/lib/lzw";
import { formatTime } from "@/lib/utils";
import { reindexClientsFile } from "@/actions/client";
import { reindexDrawingsFile } from "@/actions/drawing";
import { reindexOrdersFile } from "@/actions/order";
import { reindexOrderItemsFile } from "@/actions/order-item";
import { reindexProductsFile } from "@/actions/product";
import { reindexProductDrawingsFile } from "@/actions/product-drawing";

import type { ActionResponse, ErrorCode } from "@/lib/config";

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

    for (const fileName of dataFiles) {
      const file = fs.readFileSync(DATA_FOLDER_PATH + fileName);
      const fileSize = fs.statSync(DATA_FOLDER_PATH + fileName).size;
      originalSize += fileSize;

      let dataBuffer: Buffer<ArrayBufferLike>;

      if (algorithm === "huffman") {
        const huffman = new Huffman();
        dataBuffer = huffman.compress(file);
      } else if (algorithm === "lzw") {
        dataBuffer = LZW.compress(file);
      } else {
        return { ok: false, status: 400, message: "Algoritmo não suportado" };
      }

      const fileNameBuffer = serialize(fileName, z.string());
      const dataLengthBuffer = Buffer.alloc(4);
      dataLengthBuffer.writeUint32BE(dataBuffer.length);

      compressedSize += dataBuffer.length;

      backupFile.push(fileNameBuffer, dataLengthBuffer, dataBuffer);
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

      let dataBuffer: Buffer<ArrayBufferLike>;

      if (algorithm === "huffman") {
        const huffman = new Huffman();
        dataBuffer = huffman.decompress(compressedBuffer);
      } else if (algorithm === "lzw") {
        dataBuffer = LZW.decompress(compressedBuffer);
      } else {
        return {
          ok: false,
          status: 500,
          message:
            "Não foi possível identificar o algoritmo, provavelmente o arquivo de backup está corrompido",
        };
      }

      fs.writeFileSync(DATA_FOLDER_PATH + fileName, dataBuffer);

      offset += dataLength;
    }

    reindexAllDataFiles();

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);
    return { ok: false, status: 500 };
  }
}

export async function reindexAllDataFiles(): Promise<ActionResponse> {
  const status = await Promise.allSettled([
    reindexClientsFile(),
    reindexDrawingsFile(),
    reindexOrdersFile(),
    reindexProductsFile(),
    reindexOrderItemsFile(),
    reindexProductDrawingsFile(),
  ]).then((responses) => {
    let hasRejected = false;
    let failedStatus: ErrorCode | undefined;

    for (const response of responses) {
      if (response.status === "rejected") {
        hasRejected = true;
        continue;
      }

      if (!response.value.ok) {
        failedStatus = response.value.status;
        continue;
      }
    }

    if (hasRejected) return 500;
    if (failedStatus !== undefined) return failedStatus;

    return 200;
  });

  if (status !== 200) return { ok: false, status };

  return { ok: true, data: undefined };
}
