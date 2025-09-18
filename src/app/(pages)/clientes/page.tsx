import * as React from "react";
import Link from "next/link";

import { ClientTable } from "@/components/layout/client";
import { Section } from "@/components/layout/section";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";

import { PlusCircleIcon } from "lucide-react";

export default function ClientsPage() {
  return (
    <Section>
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
        <ClientTable />
      </div>
    </Section>
  );
}
