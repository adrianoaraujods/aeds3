import * as React from "react";
import Link from "next/link";

import { OrderForm } from "@/components/form/order-form";
import { Heading } from "@/components/typography/heading";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DEFAULT_ORDER } from "@/schemas/order";

export default function CreateOrderPage() {
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
                <BreadcrumbPage>Novo</BreadcrumbPage>
              </Heading>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <OrderForm initialValues={DEFAULT_ORDER} type="create" />
    </>
  );
}
