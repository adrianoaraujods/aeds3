"use server";

import { clientSchema } from "@/lib/schemas";
import { File } from "@/actions/file";

import type { ActionResponse } from "@/lib/config";
import type { Client } from "@/lib/schemas";

const file = new File({
  name: "clients",
  dataSchema: clientSchema,
  uniqueFields: ["name", "email", "socialName", "document", "registration"],
});

export async function createClient(
  data: Omit<Client, "id">
): Promise<ActionResponse<Client>> {
  return file.insert(data);
}

export async function getClient(id: number): Promise<ActionResponse<Client>> {
  return file.select(id);
}

export async function getAllClients(): Promise<ActionResponse<Client[]>> {
  return file.getAll();
}

export async function updateClient(
  data: Client
): Promise<ActionResponse<Client>> {
  return file.update(data.id, data);
}

export async function deleteClient(
  id: number
): Promise<ActionResponse<Client>> {
  return file.delete(id);
}
