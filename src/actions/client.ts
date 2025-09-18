"use server";

import { clientSchema } from "@/lib/schemas";
import { ByteFile } from "@/actions/file";

import type { ActionResponse } from "@/lib/config";
import type { Client } from "@/lib/schemas";

const file = new ByteFile({
  name: "clients",
  schema: clientSchema,
});

export async function createClient(
  data: Omit<Client, "id">
): Promise<ActionResponse<Client>> {
  return file.insert(data);
}

export async function getClient(id: number): Promise<ActionResponse<Client>> {
  return file.select(id);
}

export async function getClients(
  ids: number[]
): Promise<ActionResponse<(Client | null)[]>> {
  return file.select(ids);
}

export async function getAllClients(): Promise<ActionResponse<Client[]>> {
  return file.select();
}

export async function updateClient(
  data: Client
): Promise<ActionResponse<Client>> {
  return file.update(data.id, data);
}

export async function deleteClient(id: number): Promise<ActionResponse> {
  return file.delete(id);
}
