"use server";

import { File } from "@/actions/file";
import {
  createOrderItem,
  deleteAllOrderItems,
  deleteOrderItem,
  getOrderItems,
  updateOrderItem,
} from "@/actions/order-item";
import { orderDataSchema, orderSchema } from "@/schemas/order";

import type { ActionResponse, ErrorCode } from "@/lib/config";
import type { Order, OrderData, OrderItem } from "@/schemas/order";

const file = new File({
  name: "orders",
  schema: orderSchema,
  primaryKey: "number",
});

export async function createOrder(
  data: OrderData
): Promise<ActionResponse<Order, OrderItem[]>> {
  const createdOrderItems: OrderItem[] = [];

  const parser = orderDataSchema.safeParse(data);

  if (!parser.success) {
    return { ok: false, status: 400, data: createdOrderItems };
  }

  const { items, ...order } = parser.data;

  let failedStatus: ErrorCode | undefined;

  for (const item of items) {
    const creatingOrderItem = await createOrderItem({
      ...item,
      orderNumber: order.number,
      productId: item.product.id,
    });

    if (!creatingOrderItem.ok) {
      failedStatus = creatingOrderItem.status;
      break;
    }

    createdOrderItems.push(creatingOrderItem.data);
  }

  if (failedStatus === undefined) {
    const creatingOrder = file.insert(order);

    if (creatingOrder.ok) {
      return { ok: true, data: creatingOrder.data };
    }

    failedStatus = creatingOrder.status;
  }

  if (failedStatus !== undefined) {
    while (createdOrderItems.length > 0) {
      const deletingOrderItem = await deleteOrderItem(
        createdOrderItems[createdOrderItems.length - 1].id
      );

      if (!deletingOrderItem.ok) {
        return { ok: false, status: 509, data: createdOrderItems };
      }

      createdOrderItems.pop();
    }
  }

  return { ok: false, status: failedStatus, data: createdOrderItems };
}

export async function getOrder(
  number: Order["number"]
): Promise<ActionResponse<Order>> {
  return file.findBy("number", number);
}

export async function getOrderData(
  number: Order["number"]
): Promise<ActionResponse<OrderData>> {
  const findingOrder = file.findBy("number", number);

  if (!findingOrder.ok) return { ok: false, status: findingOrder.status };

  const order = findingOrder.data;

  const retrievingOrderItems = await getOrderItems(order.number);

  if (!retrievingOrderItems.ok) return { ok: false, status: 509 };

  const items = retrievingOrderItems.data;

  return { ok: true, data: { ...order, items } };
}

export async function getAllOrders(): Promise<
  ActionResponse<OrderData[], OrderData[]>
> {
  const orders: OrderData[] = [];

  const retrievingOrders = file.getAll();

  if (!retrievingOrders.ok) {
    return { ok: false, status: retrievingOrders.status, data: orders };
  }

  let failedStatus: ErrorCode | undefined;

  for (const order of retrievingOrders.data) {
    const retrievingOrderItems = await getOrderItems(order.number);

    const items = retrievingOrderItems.data;

    if (!retrievingOrderItems.ok) {
      failedStatus = retrievingOrderItems.status;
    }

    orders.push({ ...order, items });
  }

  if (failedStatus) {
    return { ok: false, status: failedStatus, data: orders };
  }

  return { ok: true, data: orders };
}

export async function updateOrder(
  data: OrderData
): Promise<ActionResponse<Order, OrderItem[]>> {
  const createdItems: OrderItem[] = [];

  const parser = orderDataSchema.safeParse(data);

  if (!parser.success) {
    return { ok: false, status: 400, data: createdItems };
  }

  const { items, ...order } = parser.data;

  const retrievingOldItems = await getOrderItems(order.number);

  if (!retrievingOldItems.ok) {
    return {
      ok: false,
      status: retrievingOldItems.status,
      data: createdItems,
    };
  }

  const oldItems = retrievingOldItems.data.map(({ id }) => id);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.id !== 0) continue;

    const creatingItem = await createOrderItem({
      ...item,
      orderNumber: order.number,
      productId: item.product.id,
    });

    if (!creatingItem.ok) {
      return { ok: false, status: creatingItem.status, data: createdItems };
    }

    createdItems.push(creatingItem.data);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.id === 0 || oldItems.includes(item.id)) continue;

    const deletingItem = await deleteOrderItem(item.id);

    if (!deletingItem.ok) {
      return { ok: false, status: 509, data: createdItems };
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.id === 0 || !oldItems.includes(item.id)) continue;

    const updatingItem = await updateOrderItem({
      ...item,
      orderNumber: order.number,
      productId: item.product.id,
    });

    if (!updatingItem.ok) {
      return { ok: false, status: updatingItem.status, data: createdItems };
    }
  }

  const updatingOrder = file.update(order);

  if (!updatingOrder.ok) {
    return {
      ok: false,
      status: updatingOrder.status,
      data: createdItems,
    };
  }

  return { ok: true, data: updatingOrder.data };
}

export async function deleteOrder(
  number: Order["number"]
): Promise<ActionResponse<Order>> {
  const removingItems = await deleteAllOrderItems(number);

  if (!removingItems.ok) {
    return { ok: false, status: removingItems.status };
  }

  const deletingOrder = file.delete(number);

  if (!deletingOrder.ok) {
    return { ok: false, status: deletingOrder.status };
  }

  return { ok: true, data: deletingOrder.data };
}
