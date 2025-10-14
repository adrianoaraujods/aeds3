"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { useData } from "@/hooks/use-data";
import { ClientForm } from "@/components/layout/client";
import { Section } from "@/components/layout/section";
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

export default function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number(React.use(params).id);
  const { data } = useData();

  const client = data.clients.find((client) => client.id === id);

  if (!client) notFound();

  const [canEdit, setCanEdit] = React.useState(false);

  return (
    <Section>
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
    </Section>
  );
}
