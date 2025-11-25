"use server";

import * as fs from "fs";

import { RSA } from "@/lib/rsa";

import type { ActionResponse } from "@/lib/config";
import type { PrivateKey, PublicKey } from "@/lib/rsa";

export async function loadKeys(): Promise<ActionResponse> {
  try {
    if (
      !process.env.PRIVATE_KEY_D ||
      !process.env.PRIVATE_KEY_N ||
      !process.env.PUBLIC_KEY_E ||
      !process.env.PUBLIC_KEY_N
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
    e: BigInt(process.env.PUBLIC_KEY_E!),
    n: BigInt(process.env.PUBLIC_KEY_N!),
  };
}

export async function getPrivateKey(): Promise<PrivateKey> {
  return {
    d: BigInt(process.env.PRIVATE_KEY_D!),
    n: BigInt(process.env.PRIVATE_KEY_N!),
  };
}

export async function createKeys(): Promise<ActionResponse> {
  try {
    const { privateKey, publicKey } = RSA.generateKeys();

    const file =
      `PRIVATE_KEY_D="${privateKey.d}"\n` +
      `PRIVATE_KEY_N="${privateKey.n}"\n` +
      `PUBLIC_KEY_E="${publicKey.e}"\n` +
      `PUBLIC_KEY_N="${publicKey.n}"\n`;

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
