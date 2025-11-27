import { createOrder } from "@/actions/order";
import { MOCK_CLIENTS_DATA } from "@/tests/clients.test";
import { MOCK_PRODUCTS_DATA } from "@/tests/products.test";

import type { OrderData } from "@/schemas/order";

export async function createMockOrders() {
  for (const order of MOCK_ORDERS_DATA) {
    const res = await createOrder(order);

    if (!res.ok) {
      console.error("Dados do Pedido: ", order);
    }

    console.log(res.message);
  }
}

export const MOCK_ORDERS_DATA: OrderData[] = [
  {
    date: new Date(),
    items: [
      {
        id: 0,
        amount: 3,
        deliver: new Date(),
        item: "0010",
        price: 315.87,
        product: { ...MOCK_PRODUCTS_DATA[0] },
      },
    ],
    number: "4500123456",
    total: 0,
    state: "Completo",
    client: MOCK_CLIENTS_DATA[0],
  },
];
