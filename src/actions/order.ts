"use server";

import { orderSchema } from "@/lib/schemas";
import { File } from "@/actions/file";

import type { ActionResponse } from "@/lib/config";
import type { Order } from "@/lib/schemas";

const file = new File({
  name: "orders",
  dataSchema: orderSchema,
  uniqueFields: ["number"],
});

export async function createOrder(
  data: Omit<Order, "id">
): Promise<ActionResponse<Order>> {
  return file.insert(data);
}

export async function getOrder(id: number): Promise<ActionResponse<Order>> {
  return file.select(id);
}

export async function getAllOrders(): Promise<ActionResponse<Order[]>> {
  return file.getAll();
}

export async function updateOrder(data: Order): Promise<ActionResponse<Order>> {
  return file.update(data.id, data);
}

export async function deleteOrder(id: number): Promise<ActionResponse<Order>> {
  return file.delete(id);
}
