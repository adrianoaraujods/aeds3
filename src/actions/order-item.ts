"use server";

import { File } from "@/actions/file";
import { getOrderData } from "@/actions/order";
import { getProductData } from "@/actions/product";
import { orderItemSchema } from "@/schemas/order";

import type { ActionResponse, ErrorCode } from "@/lib/config";
import type {
  Order,
  OrderData,
  OrderItem,
  OrderItemData,
} from "@/schemas/order";
import type { Product } from "@/schemas/product";

const file = new File({
  name: "order-items",
  schema: orderItemSchema,
  primaryKey: "id",
  indexedFields: ["orderNumber", "productId"],
});

export async function createOrderItem(
  data: OrderItem
): Promise<ActionResponse<OrderItem>> {
  return file.insert(data);
}

export async function getOrderItems(
  orderNumber: Order["number"]
): Promise<ActionResponse<OrderItemData[], OrderItemData[]>> {
  const items: OrderItemData[] = [];

  const retrievingItems = file.select("orderNumber", orderNumber);

  if (!retrievingItems.ok) {
    return { ok: false, status: retrievingItems.status, data: items };
  }

  const orderItems = retrievingItems.data;

  let failedStatus: ErrorCode | undefined;

  for (const item of orderItems) {
    const retrievingProduct = await getProductData(item.productId);

    if (!retrievingProduct.ok) {
      failedStatus = retrievingProduct.status;
    } else {
      items.push({ ...item, product: retrievingProduct.data });
    }
  }

  if (failedStatus !== undefined) {
    return { ok: false, status: failedStatus, data: items };
  }

  return { ok: true, data: items };
}

export async function getProductOrders(
  productId: Product["id"]
): Promise<ActionResponse<OrderData[], OrderData[]>> {
  const orders: OrderData[] = [];

  const retrievingItems = file.select("productId", productId);

  if (!retrievingItems.ok) {
    return { ok: false, status: retrievingItems.status, data: orders };
  }

  const ordersNumbers = [
    ...new Set(retrievingItems.data.map(({ orderNumber }) => orderNumber)),
  ];

  let failedStatus: ErrorCode | undefined;

  for (const orderNumber of ordersNumbers) {
    const retrievingOrder = await getOrderData(orderNumber);

    if (!retrievingOrder.ok) {
      failedStatus = retrievingOrder.status;
    } else {
      orders.push(retrievingOrder.data);
    }
  }

  if (failedStatus !== undefined) {
    return { ok: false, status: failedStatus, data: orders };
  }

  return { ok: true, data: orders };
}

export async function updateOrderItem(
  data: OrderItem
): Promise<ActionResponse<OrderItem>> {
  return file.update(data);
}

export async function deleteOrderItem(
  id: OrderItem["id"]
): Promise<ActionResponse<OrderItem>> {
  return file.delete(id);
}

export async function deleteAllOrderItems(
  orderNumber: Order["number"]
): Promise<ActionResponse> {
  const retrievingOrderItems = file.select("orderNumber", orderNumber);

  if (!retrievingOrderItems.ok) {
    return { ok: false, status: retrievingOrderItems.status };
  }

  const relations = retrievingOrderItems.data;

  let failedStatus: ErrorCode | undefined;

  for (const { id } of relations) {
    const deletingRelation = file.delete(id);

    if (!deletingRelation.ok) {
      failedStatus = deletingRelation.status;
    }
  }

  if (failedStatus) {
    return { ok: false, status: failedStatus };
  }

  return { ok: true, data: undefined };
}
