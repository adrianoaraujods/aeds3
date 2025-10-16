import * as React from "react";
import Link from "next/link";

import { ClientForm } from "@/components/layout/client";
import { Heading } from "@/components/typography/heading";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import type { Client } from "@/lib/schemas";

const defaultClient: Client = {
  id: 0,
  document: "",
  socialName: "",
  registration: "",
  name: "",
  email: "",
  cellphone: "",
  payment: 30,
  currency: "BRL",
  address: {
    street: "",
    country: "",
    city: "",
    state: "",
    number: "",
    district: "",
    complement: "",
  },
};

export default function CreateClientPage() {
  return (
    <>
      <header className="mb-4 flex justify-between border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Heading element="h1" className="mb-0" asChild>
                  <Link href="/clientes">Clientes</Link>
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

      <ClientForm initialValues={defaultClient} type="create" />
    </>
  );
}
