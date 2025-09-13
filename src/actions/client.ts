"use server";

import { clientSchema } from "@/lib/schemas";
import { ByteFile } from "@/actions/files";

import type { ActionResponse } from "@/lib/config";
import type { Client } from "@/lib/schemas";

const file = new ByteFile({
  filePath: "./data/client.db",
  primaryKey: "document",
  schema: clientSchema,
  sizes: {
    cellphone: 4,
    city: 4,
    country: 4,
    currency: 3,
    document: 14,
    email: 4,
    name: 4,
    number: 4,
    payment: 4,
    registration: 4,
    socialName: 4,
    state: 4,
    street: 4,
    complement: 4,
    district: 4,
  },
});

async function createClient(data: Client): Promise<ActionResponse<Client>> {
  return file.append(data);
}

async function readClient(
  document: Client["document"]
): Promise<ActionResponse<Client>> {
  return file.get(document);
}

async function getAllClients(): Promise<ActionResponse<Client[]>> {
  return file.getAll();
}

async function updateClient(
  document: Client["document"],
  patch: Client
): Promise<ActionResponse<Client>> {
  return file.update(document, patch);
}

async function deleteClient(
  document: Client["document"]
): Promise<ActionResponse> {
  return file.delete(document);
}

export { getAllClients, createClient, readClient, updateClient, deleteClient };
