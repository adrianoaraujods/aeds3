"use client";

import { Heading } from "@/components/typography/heading";
import { Button } from "@/components/ui/button";
import { createMockClients } from "@/tests/clients.test";
import { createMockOrders } from "@/tests/orders.test";
import { createMockProducts } from "@/tests/products.test";

export default function HomePage() {
  return (
    <>
      <header className="mb-2 flex justify-between border-b">
        <Heading element="h1" className="mb-0">
          Testes
        </Heading>
      </header>

      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-4">
          <Heading>Registros:</Heading>

          <Button variant="outline" onClick={createMockClients}>
            Inserir Clientes
          </Button>

          <Button variant="outline" onClick={createMockProducts}>
            Inserir Produtos
          </Button>

          <Button variant="outline" onClick={createMockOrders}>
            Inserir Pedidos
          </Button>
        </div>
      </div>
    </>
  );
}
