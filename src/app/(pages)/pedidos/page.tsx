import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";

import { getAllOrders } from "@/actions/order";
import { OrdersTable } from "@/components/table/orders-table";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";

import { PlusCircleIcon } from "lucide-react";

import type { OrderData } from "@/schemas/order";

export default async function OrdersPage() {
  const retrievingOrders = await getAllOrders();

  if (!retrievingOrders.ok) {
    toast.error(retrievingOrders.message);
  }

  const orders: OrderData[] = retrievingOrders.data;

  return (
    <>
      <header className="mb-2 flex justify-between border-b">
        <Heading element="h1" className="mb-0">
          Pedidos
        </Heading>

        <Button variant="outline" asChild>
          <Link href="/pedidos/novo">
            <PlusCircleIcon />

            <Text>Adicionar</Text>
          </Link>
        </Button>
      </header>

      <OrdersTable orders={orders} />
    </>
  );
}
