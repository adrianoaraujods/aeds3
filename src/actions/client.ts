"use server";

import { RecordFile } from "@/actions/record-file";
import { clientSchema } from "@/schemas/client";

import type { ActionResponse } from "@/lib/config";
import type { Client } from "@/schemas/client";

const file = new RecordFile({
  name: "clients",
  schema: clientSchema,
  primaryKey: "id",
  uniqueFields: ["name", "email", "socialName", "document", "registration"],
});

export async function createClient(
  data: Omit<Client, "id">
): Promise<ActionResponse<Client>> {
  return file.insert(data);
}

export async function getClient(id: number): Promise<ActionResponse<Client>> {
  return file.findBy("id", id);
}

export async function getAllClients(): Promise<ActionResponse<Client[]>> {
  return file.getAll();
}

export async function updateClient(
  data: Client
): Promise<ActionResponse<Client>> {
  return file.update(data);
}

export async function deleteClient(
  id: number
): Promise<ActionResponse<Client>> {
  return file.delete(id);
}

export async function reindexClientsFile() {
  return file.reindex();
}
