import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";

import { getAllClients } from "@/actions/client";
import { ClientsTable } from "@/components/table/clients-table";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";

import { PlusCircleIcon } from "lucide-react";

import type { ClientData } from "@/schemas/client";

export default async function ClientsPage() {
  const retrievingClients = await getAllClients();

  if (!retrievingClients.ok) {
    toast.error(retrievingClients.message);
  }

  const clients: ClientData[] = retrievingClients.data || [];

  return (
    <>
      <header className="mb-2 flex justify-between border-b">
        <Heading element="h1" className="mb-0">
          Clientes
        </Heading>

        <Button variant="outline" asChild>
          <Link href="/clientes/novo">
            <PlusCircleIcon />

            <Text>Adicionar</Text>
          </Link>
        </Button>
      </header>

      <div>
        <ClientsTable clients={clients} />
      </div>
    </>
  );
}
