"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { toast } from "sonner";

import { getClient } from "@/actions/client";
import { ClientForm } from "@/components/form/client-form";
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

import { LockOpenIcon } from "lucide-react";

import type { ClientData } from "@/schemas/client";

export default function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number(React.use(params).id);

  const [client, setClient] = React.useState<ClientData | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);

  React.useEffect(() => {
    getClient(id).then((res) => {
      if (res.ok) {
        setClient(res.data);
        return;
      }

      switch (res.status) {
        case 404:
          notFound();
        default:
          toast.error("Erro ao carregar o cliente.");
      }
    });
  }, [id]);

  if (!client) return null;

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
                <BreadcrumbPage>{client.name}</BreadcrumbPage>
              </Heading>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {!canEdit && (
          <Button onClick={() => setCanEdit(true)}>
            <Text>Habilitar Edição</Text>

            <LockOpenIcon />
          </Button>
        )}
      </header>

      <ClientForm
        initialValues={client}
        type="edit"
        canEdit={canEdit}
        setCanEdit={setCanEdit}
      />
    </>
  );
}
