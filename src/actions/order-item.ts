"use server";

import { orderItemSchema } from "@/lib/schemas";
import { File } from "@/actions/file";

import type { ActionResponse } from "@/lib/config";
import type { OrderItem } from "@/lib/schemas";

const file = new File({
  name: "orders",
  dataSchema: orderItemSchema,
  uniqueFields: ["item"],
});

export async function createOrderItem(
  data: Omit<OrderItem, "id">
): Promise<ActionResponse<OrderItem>> {
  return file.insert(data);
}

export async function getOrderItem(
  id: number
): Promise<ActionResponse<OrderItem>> {
  return file.select(id);
}

export async function updateOrderItem(
  data: OrderItem
): Promise<ActionResponse<OrderItem>> {
  return file.update(data.id, data);
}

export async function deleteOrderItem(
  id: number
): Promise<ActionResponse<OrderItem>> {
  return file.delete(id);
}
