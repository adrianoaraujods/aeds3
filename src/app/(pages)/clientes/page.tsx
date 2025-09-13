import * as React from "react";

import { ClientDialog, ClientTable } from "@/components/layout/client";
import { Section } from "@/components/layout/section";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";

import { PlusCircleIcon } from "lucide-react";

import type { Client } from "@/lib/schemas";

const defaultClient: Client = {
  document: "",
  socialName: "",
  registration: "",
  name: "",
  email: "",
  cellphone: "",
  payment: 30,
  currency: "BRL",
  street: "",
  country: "",
  city: "",
  state: "",
  number: "",
  district: "",
  complement: "",
};

export default function ClientsPage() {
  return (
    <Section>
      <header className="mb-2 flex justify-between border-b">
        <Heading element="h1" className="mb-0">
          Clientes
        </Heading>

        <ClientDialog
          initialValues={defaultClient}
          type="create"
          trigger={
            <DialogTrigger asChild>
              <Button variant="outline">
                <PlusCircleIcon />

                <Text>Adicionar</Text>
              </Button>
            </DialogTrigger>
          }
        />
      </header>

      <div>
        <ClientTable />
      </div>
    </Section>
  );
}
