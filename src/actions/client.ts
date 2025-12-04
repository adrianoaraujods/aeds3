"use server";

import { getClientOrders } from "@/actions/order";
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

export async function getClient(
  clientId: Client["id"]
): Promise<ActionResponse<Client>> {
  return file.findBy("id", clientId);
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
  clientId: Client["id"]
): Promise<ActionResponse<Client>> {
  const retrievingOrders = await getClientOrders(clientId);

  if (!retrievingOrders.ok) {
    return {
      ok: false,
      status: retrievingOrders.status,
      message:
        "Houve algum erro ao recuperar os pedidos do cliente. Não foi possível excluir o cliente.",
    };
  }

  const orders = retrievingOrders.data;

  if (orders.length > 0) {
    return {
      ok: false,
      status: 409,
      message: "Existem pedidos desse cliente, não é permitido sua exclusão.",
    };
  }

  return file.delete(clientId);
}

export async function reindexClientsFile() {
  return file.reindex();
}
