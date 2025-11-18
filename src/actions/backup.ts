"use server";

import * as fs from "fs";
import z from "zod";

import { serialize } from "@/lib/buffer";
import { DATA_FOLDER_PATH } from "@/lib/config";
import { Huffman } from "@/lib/huffman";
import { formatTime } from "@/lib/utils";

import type { ActionResponse } from "@/lib/config";

type CompressionAlgorithm = "huffman" | "lzw";

type BackupFile = z.infer<typeof backupFileSchema>;
const backupFileSchema = z.array(
  z.object({
    fileName: z.string(),
    data: z.string(),
  })
);

export async function createBackup(
  algorithm: CompressionAlgorithm
): Promise<ActionResponse> {
  try {
    new Backup(algorithm).save();

    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);
    return { ok: false, status: 500 };
  }
}

class Backup {
  private readonly filePath;

  constructor(private readonly algorithm: CompressionAlgorithm) {
    this.filePath =
      DATA_FOLDER_PATH + "backups/" + formatTime(new Date()) + ".bkp";
  }

  public save() {
    const dataFiles = fs
      .readdirSync(DATA_FOLDER_PATH)
      .filter((fileName) => fileName.includes(".db"));

    const backupFile: BackupFile = [];

    if (this.algorithm === "huffman") {
      const huffman = new Huffman();

      for (const fileName of dataFiles) {
        const file = fs.readFileSync(DATA_FOLDER_PATH + fileName);
        const dataString = file.toString();

        const data = huffman.encode(dataString);

        backupFile.push({ fileName, data });
      }
    } else {
      throw new Error("Algoritmo não suportado");
    }

    const backupBuffer = serialize(backupFile, backupFileSchema);

    fs.writeFileSync(this.filePath, backupBuffer);
  }

  public load() {}

  private async append() {}
}
