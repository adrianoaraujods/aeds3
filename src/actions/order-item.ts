"use server";

import { File } from "@/actions/file";
import { orderItemSchema } from "@/schemas/order";

import type { ActionResponse } from "@/lib/config";
import type { OrderItem, OrderItemData } from "@/schemas/order";

const file = new File({
  name: "order-items",
  schema: orderItemSchema,
  primaryKey: "id",
});

export async function createOrderItem(
  data: OrderItemData
): Promise<ActionResponse<OrderItem>> {
  return file.insert(data);
}

export async function getOrderItem(
  id: OrderItem["id"]
): Promise<ActionResponse<OrderItem>> {
  return file.select("id", id);
}

export async function updateOrderItem(
  data: OrderItemData
): Promise<ActionResponse<OrderItem>> {
  return file.update(data);
}

export async function deleteOrderItem(
  id: OrderItem["id"]
): Promise<ActionResponse<OrderItem>> {
  return file.delete(id);
}
