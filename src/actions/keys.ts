"use server";

import * as fs from "fs";

import { RSA } from "@/lib/rsa";

import type { ActionResponse } from "@/lib/config";
import type { PrivateKey, PublicKey } from "@/lib/rsa";

export async function loadKeys(): Promise<ActionResponse> {
  try {
    if (
      !process.env.RLA_D ||
      !process.env.RLA_N ||
      !process.env.RLA_E ||
      !process.env.RLA_N
    ) {
      createKeys();

      return {
        ok: true,
        status: 201,
        message: "Chaves de criptografia geradas com sucesso.",
        data: undefined,
      };
    }

    return {
      ok: true,
      status: 200,
      message: "Chaves de criptografia carregadas com sucesso.",
      data: undefined,
    };
  } catch (error) {
    console.error(error);
  }

  return {
    ok: false,
    status: 500,
    message: "Houve algum erro ao carregar as chaves de criptografia.",
  };
}

export async function getPublicKey(): Promise<PublicKey> {
  return {
    e: BigInt(process.env.RLA_E!),
    n: BigInt(process.env.RLA_N!),
  };
}

export async function getPrivateKey(): Promise<PrivateKey> {
  return {
    d: BigInt(process.env.RLA_D!),
    n: BigInt(process.env.RLA_N!),
  };
}

export async function createKeys(): Promise<ActionResponse> {
  try {
    const { privateKey, publicKey } = RSA.generateKeys();

    const file =
      `RLA_D="${privateKey.d}"\n` +
      `RLA_N="${privateKey.n}"\n` +
      `RLA_E="${publicKey.e}"\n`;

    fs.writeFileSync("./.env", file);

    return {
      ok: true,
      status: 201,
      message: "Chaves criadas e salvas com sucesso!",
      data: undefined,
    };
  } catch (error) {
    console.error(error);
  }

  return {
    ok: false,
    status: 500,
    message: "Houve algum erro ao salvar o arquivo com as chaves.",
  };
}
