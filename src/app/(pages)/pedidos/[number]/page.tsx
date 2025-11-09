"use client";

import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";

import { getOrderData } from "@/actions/order";
import { OrderForm } from "@/components/form/order-form";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { OrderData } from "@/schemas/order";

import { LockOpenIcon } from "lucide-react";

export default function OrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = React.use(params);

  const [isLoading, setIsLoading] = React.useState(true);
  const [order, setOrder] = React.useState<OrderData | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);

  React.useEffect(() => {
    getOrderData(number).then(async (res) => {
      if (res.ok) {
        setOrder(res.data);
      } else {
        toast.error("Erro ao carregar o pedido.");
      }

      setIsLoading(false);
    });
  }, [number]);

  if (isLoading) return null;

  return (
    <>
      <header className="mb-4 flex justify-between border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Heading element="h1" className="mb-0" asChild>
                  <Link href="/pedidos">Pedidos</Link>
                </Heading>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator className="[&>svg]:size-8" />

            <BreadcrumbItem>
              <Heading element="h1" className="mb-0" asChild>
                <BreadcrumbPage>
                  {!order ? "Não Encontrado" : order.number}
                </BreadcrumbPage>
              </Heading>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {order && !canEdit && (
          <Button onClick={() => setCanEdit(true)}>
            <Text>Habilitar Edição</Text>

            <LockOpenIcon />
          </Button>
        )}
      </header>

      {order && (
        <OrderForm
          initialValues={order}
          type="edit"
          canEdit={canEdit}
          setCanEdit={setCanEdit}
        />
      )}
    </>
  );
}
