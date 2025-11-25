"use server";

import { RSA } from "@/lib/rsa";
import { File } from "@/actions/file";
import { getPrivateKey } from "@/actions/keys";
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

  if (!retrievingItems.ok)
    return {
      ...retrievingItems,
      message: "Houve algum erro ao recuperar os itens do pedido.",
      data: items,
    };

  const privateKey = await getPrivateKey();

  const orderItems = retrievingItems.data.map(({ price, ...item }) => ({
    ...item,
    price: Number(RSA.decrypt(price, privateKey)),
  }));

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
    return {
      ok: false,
      status: failedStatus,
      message: "Houve algum erro ao carregar algum produto do pedido.",
      data: items,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Pedido carregado com sucesso!",
    data: items,
  };
}

export async function getProductOrders(
  productId: Product["id"]
): Promise<ActionResponse<OrderData[], OrderData[]>> {
  const orders: OrderData[] = [];

  const retrievingItems = file.select("productId", productId);

  if (!retrievingItems.ok) {
    return {
      ok: false,
      status: retrievingItems.status,
      message: "Houve algum erro ao carregar os itens do pedido com o produto.",
      data: orders,
    };
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
    return {
      ok: false,
      status: failedStatus,
      message: "Houve algum erro ao carregar o pedido com o produto.",
      data: orders,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Pedidos com o produto carregados com sucesso!",
    data: orders,
  };
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
    return {
      ok: false,
      status: retrievingOrderItems.status,
      message: "Houve algum erro ao carregar os itens do pedido!",
    };
  }

  const items = retrievingOrderItems.data;

  let failedStatus: ErrorCode | undefined;

  for (const { id } of items) {
    const deletingItem = file.delete(id);

    if (!deletingItem.ok) {
      failedStatus = deletingItem.status;
    }
  }

  if (failedStatus) {
    return {
      ok: false,
      status: failedStatus,
      message:
        "Houve algum erro ao excluir os itens do pedido. Nenhuma alteração foi feita.",
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Todos os itens do pedido foram excluídos com sucesso!",
    data: undefined,
  };
}

export async function reindexOrderItemsFile() {
  return file.reindex();
}
