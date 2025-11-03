"use server";

import { File } from "@/actions/file";
import { orderDataSchema, orderSchema } from "@/schemas/order";

import type { ActionResponse } from "@/lib/config";
import type { Order, OrderData, OrderItemData } from "@/schemas/order";

import { createOrderItem, updateOrderItem } from "./order-item";

const file = new File({
  name: "orders",
  schema: orderSchema,
  primaryKey: "number",
});

export async function createOrder(
  data: OrderData
): Promise<ActionResponse<Order>> {
  const parser = orderDataSchema.safeParse(data);

  if (!parser.success) return { ok: false, status: 400 };

  const itemsIds: number[] = [];

  for (const item of parser.data.items) {
    const orderItem: OrderItemData = {
      ...item,
      orderNumber: parser.data.number,
      productId: item.product.id,
    };

    const res = await createOrderItem(orderItem);

    if (!res.ok) return { ok: false, status: res.status };

    itemsIds.push(res.data.id);
  }

  return file.insert({ ...parser.data, items: itemsIds });
}

export async function getOrder(
  number: Order["number"]
): Promise<ActionResponse<Order>> {
  return file.select("number", number);
}

export async function getAllOrders(): Promise<ActionResponse<Order[]>> {
  return file.getAll();
}

export async function updateOrder(
  data: OrderData
): Promise<ActionResponse<Order>> {
  const parser = orderDataSchema.safeParse(data);

  if (!parser.success) return { ok: false, status: 400 };

  const itemsIds: number[] = [];

  for (const item of parser.data.items) {
    const orderItem: OrderItemData = {
      ...item,
      orderNumber: parser.data.number,
      productId: item.product.id,
    };

    const res = await (orderItem.id === 0
      ? createOrderItem(orderItem)
      : updateOrderItem(orderItem));

    if (!res.ok) return { ok: false, status: res.status };

    itemsIds.push(res.data.id);
  }

  return file.update({ ...parser.data, items: itemsIds });
}

export async function deleteOrder(
  number: Order["number"]
): Promise<ActionResponse<Order>> {
  return file.delete(number);
}
