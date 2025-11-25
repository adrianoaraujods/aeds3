"use server";

import { RSA } from "@/lib/rsa";
import { getClient } from "@/actions/client";
import { File } from "@/actions/file";
import { getPublicKey } from "@/actions/keys";
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
    return {
      ok: false,
      status: 400,
      message: "Dados Inválidos! Verifique os campos do pedido.",
      data: createdOrderItems,
    };
  }

  const { items, ...order } = parser.data;

  let failedStatus: ErrorCode | undefined;

  const publicKey = await getPublicKey();

  for (const item of items) {
    const creatingOrderItem = await createOrderItem({
      ...item,
      orderNumber: order.number,
      productId: item.product.id,
      price: RSA.encrypt(String(item.price), publicKey),
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
      return {
        ok: true,
        status: 201,
        message: "Pedido criado com sucesso!",
        data: creatingOrder.data,
      };
    }

    failedStatus = creatingOrder.status;
  }

  if (failedStatus !== undefined) {
    while (createdOrderItems.length > 0) {
      const deletingOrderItem = await deleteOrderItem(
        createdOrderItems[createdOrderItems.length - 1].id
      );

      if (!deletingOrderItem.ok) {
        return {
          ok: false,
          status: 509,
          message:
            "Houve algum erro ao criar o pedido! Alguns itens foram criados, isso pode ter corrompido os dados!",
          data: createdOrderItems,
        };
      }

      createdOrderItems.pop();
    }
  }

  return {
    ok: false,
    status: failedStatus,
    message: "Houve algum erro ao criar o pedido! Nenhuma alteração foi feita.",
    data: createdOrderItems,
  };
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
  if (!findingOrder.ok) return findingOrder;

  const order = findingOrder.data;

  const retrievingOrderItems = await getOrderItems(order.number);
  if (!retrievingOrderItems.ok) {
    return {
      ok: false,
      status: 509,
      message:
        "Não foi possível recuperar os itens do pedido. Existem dados corrompidos no banco de dados.",
    };
  }

  const items = retrievingOrderItems.data;

  const retrievingClient = await getClient(order.clientId);
  if (!retrievingClient.ok) {
    return {
      ok: false,
      status: 509,
      message:
        "Não foi possível recuperar o cliente do pedido. Existem dados corrompidos no banco de dados.",
    };
  }

  const client = retrievingClient.data;

  return {
    ok: true,
    status: 200,
    message: "Pedido recuperado com sucesso!",
    data: { ...order, items, client },
  };
}

export async function getAllOrders(): Promise<
  ActionResponse<OrderData[], OrderData[]>
> {
  const orders: OrderData[] = [];

  const retrievingOrders = file.getAll();

  if (!retrievingOrders.ok) {
    return {
      ok: false,
      status: retrievingOrders.status,
      message: "Houve algum erro ao carregar os pedidos!",
      data: orders,
    };
  }

  let failedStatus: ErrorCode | undefined;

  for (const order of retrievingOrders.data) {
    const retrievingClient = await getClient(order.clientId);
    if (!retrievingClient.ok) {
      failedStatus = retrievingClient.status;
      continue;
    }

    const client = retrievingClient.data;

    const retrievingOrderItems = await getOrderItems(order.number);

    if (!retrievingOrderItems.ok) {
      failedStatus = retrievingOrderItems.status;
    }

    const items = retrievingOrderItems.data;

    orders.push({ ...order, items, client });
  }

  if (failedStatus) {
    return {
      ok: false,
      status: failedStatus,
      message:
        "Houve algum erro ao recuperar o cliente ou os itens dos pedidos!",
      data: orders,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Pedidos recuperados com sucesso!",
    data: orders,
  };
}

export async function updateOrder(
  data: OrderData
): Promise<ActionResponse<Order, OrderItem[]>> {
  const createdItems: OrderItem[] = [];

  const parser = orderDataSchema.safeParse(data);

  if (!parser.success) {
    return {
      ok: false,
      status: 400,
      message: "Dados Inválidos! Verifique os campos do pedido.",
      data: createdItems,
    };
  }

  const {
    items,
    client: { id: clientId },
    ...order
  } = parser.data;

  const retrievingOldItems = await getOrderItems(order.number);

  if (!retrievingOldItems.ok) {
    return {
      ok: false,
      status: retrievingOldItems.status,
      message:
        "Houve algum erro ao carregar o pedido! Nenhuma alteração foi feita.",
      data: createdItems,
    };
  }

  const oldItems = retrievingOldItems.data.map(({ id }) => id);

  const publicKey = await getPublicKey();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.id !== 0) continue;

    const creatingItem = await createOrderItem({
      ...item,
      orderNumber: order.number,
      productId: item.product.id,
      price: RSA.encrypt(String(item.price), publicKey),
    });

    if (!creatingItem.ok) {
      return {
        ok: false,
        status: creatingItem.status,
        message:
          "Houve algum erro ao criar um item do pedido! Pode ser que algum item tenha sido adicionado.",
        data: createdItems,
      };
    }

    createdItems.push(creatingItem.data);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.id === 0 || oldItems.includes(item.id)) continue;

    const deletingItem = await deleteOrderItem(item.id);

    if (!deletingItem.ok) {
      return {
        ok: false,
        status: 509,
        message:
          "Houve algum erro ao remover os itens antigos do pedido! Podem existir dados corrompidos.",
        data: createdItems,
      };
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.id === 0 || !oldItems.includes(item.id)) continue;

    const updatingItem = await updateOrderItem({
      ...item,
      orderNumber: order.number,
      productId: item.product.id,
      price: RSA.encrypt(String(item.price), publicKey),
    });

    if (!updatingItem.ok) {
      return {
        ok: false,
        status: updatingItem.status,
        message:
          "Houve algum erro ao atualizar algum item do pedido! Alguma alteração pode ter ocorrido.",
        data: createdItems,
      };
    }
  }

  const updatingOrder = file.update({ ...order, clientId });

  if (!updatingOrder.ok) {
    return {
      ok: false,
      status: updatingOrder.status,
      message:
        "Houve algum erro ao atualizar o pedido! Nenhuma alteração foi feita.",
      data: createdItems,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Pedido modificado com sucesso!",
    data: updatingOrder.data,
  };
}

export async function deleteOrder(
  number: Order["number"]
): Promise<ActionResponse<Order>> {
  const removingItems = await deleteAllOrderItems(number);

  if (!removingItems.ok) {
    return {
      ok: false,
      status: removingItems.status,
      message:
        "Houve algum erro ao remover os itens do pedido! Algum item pode ter sido excluído.",
    };
  }

  const deletingOrder = file.delete(number);

  if (!deletingOrder.ok) {
    return {
      ok: false,
      message:
        "Houve algum erro ao excluír o pedido! Os itens já foram removidos.",
      status: deletingOrder.status,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Pedido excluído com sucesso!",
    data: deletingOrder.data,
  };
}

export async function reindexOrdersFile() {
  return file.reindex();
}
