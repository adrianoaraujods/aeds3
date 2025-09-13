"use client";

import * as React from "react";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";

import { useAppForm } from "@/hooks/use-app-form";
import { useData } from "@/hooks/use-data";
import { CURRENCIES } from "@/lib/schemas";
import { createClient, updateClient } from "@/actions/client";
import { SelectOption } from "@/components/layout/form";
import { DataTable } from "@/components/table/data-table";
import { Heading } from "@/components/typography/heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PencilIcon } from "lucide-react";

import type { Client, Currency } from "@/lib/schemas";

const currencies: { [currency in Currency]: Omit<SelectOption, "value"> } = {
  BRL: { title: "Real" },
  USD: { title: "Dólar" },
};

type ClientDialogProps = {
  initialValues: Client;
  trigger: React.ReactNode;
  type: "create" | "edit";
};

function ClientDialog({ initialValues, type, trigger }: ClientDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const { setData } = useData();

  const form = useAppForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      if (type === "create") {
        handleCreate(value);
      } else {
        handleEdit(value);
      }
    },
  });

  async function handleCreate(client: Client) {
    const res = await createClient(client);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        clients: [...prev.clients, res.data],
      }));

      setIsOpen(false);
      toast.success("Cliente criado com sucesso!");

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o cliente. Confira os dados do cliente."
        );
        break;
      case 404:
        toast.warning("Esse cliente já existe do cliente.");
        break;
      case 500:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o cliente, tente novamente."
        );
        break;
      default:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível salvar o cliente."
        );
        break;
    }
  }

  async function handleEdit(client: Client) {
    const res = await updateClient(initialValues.document, client);

    if (res.ok) {
      setData((prev) => {
        const clients = { ...prev.clients };

        for (let i = 0; i < clients.length; i++) {
          if (clients[i].document !== initialValues.document) {
            clients[i] = res.data;
            break;
          }
        }

        return { ...prev, clients };
      });

      setIsOpen(false);
      toast.success("Cliente editado com sucesso!");

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o cliente. Confira os dados do cliente."
        );
        break;
      case 404:
        toast.warning("Esse cliente já existe do cliente.");
        break;
      case 500:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o cliente, tente novamente."
        );
        break;
      default:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível salvar o cliente."
        );
        break;
    }
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DialogTrigger asChild>{trigger}</DialogTrigger>

        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {type === "create"
                ? "Adicionar Cliente"
                : `Editar ${initialValues.name}`}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo com os dados do cliente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <form.AppField
              name="name"
              children={(field) => <field.TextField label="Nome" />}
            />

            <form.AppField
              name="socialName"
              children={(field) => <field.TextField label="Razão Social" />}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField
                name="document"
                children={(field) => (
                  <field.DocumentNumberField
                    label="CPNJ / CPF"
                    placeholder="00.000.000/0000-00"
                  />
                )}
              />

              <form.AppField
                name="registration"
                children={(field) => (
                  <field.TextField label="Inscrição Estadual" />
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField
                name="email"
                children={(field) => (
                  <field.TextField
                    label="E-mail"
                    type="email"
                    placeholder="contato@empresa.com"
                  />
                )}
              />

              <form.AppField
                name="cellphone"
                children={(field) => (
                  <field.PhoneField
                    label="Telefone"
                    placeholder="(31) 3000-0000"
                  />
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField
                name="payment"
                children={(field) => (
                  <field.TextField
                    label="Condições de Pagamento"
                    placeholder="30"
                    type="number"
                    min={0}
                    max={120}
                  />
                )}
              />

              <form.AppField
                name="currency"
                children={(field) => (
                  <field.SelectField
                    label="Moeda"
                    defaultValue={CURRENCIES[0]}
                    options={Object.keys(currencies).map((currency) => ({
                      value: currency,
                      title: currencies[currency as Currency].title,
                    }))}
                  />
                )}
              />
            </div>

            <div>
              <Heading element="span" className="mb-2 border-b">
                Endereço
              </Heading>

              <div className="grid grid-cols-3 gap-2">
                <form.AppField
                  name="country"
                  children={(field) => <field.TextField label="País" />}
                />

                <form.AppField
                  name="state"
                  children={(field) => <field.TextField label="Estado" />}
                />

                <form.AppField
                  name="city"
                  children={(field) => <field.TextField label="Cidade" />}
                />

                <form.AppField
                  name="street"
                  children={(field) => <field.TextField label="Logradouro" />}
                />

                <form.AppField
                  name="district"
                  children={(field) => <field.TextField label="Bairro" />}
                />

                <form.AppField
                  name="number"
                  children={(field) => <field.TextField label="Número" />}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                form.handleSubmit();
              }}
            >
              Salvar
            </Button>

            <Button
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                form.reset();
              }}
              variant="outline"
              type="reset"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

function ClientTable() {
  const { data } = useData();

  const table = useReactTable<Client>({
    columns: [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "socialName", header: "Razão Social" },
      { accessorKey: "document", header: "CPNJ / CPF" },
      { accessorKey: "registration", header: "Inscrição Estadual" },
      {
        accessorKey: "payment",
        header: "Condições de Pagamento",
        cell: ({ getValue }) => `${getValue()} dias`,
      },
      {
        accessorKey: "more",
        header: "",
        cell: ({ row }) => (
          <ClientDialog
            initialValues={row.original}
            type="edit"
            trigger={
              <Button variant="ghost" size="icon">
                <PencilIcon className="size-5" />
              </Button>
            }
          />
        ),
      },
    ],
    data: data.clients,
    getCoreRowModel: getCoreRowModel(),
  });

  return <DataTable table={table} />;
}

export { ClientDialog, ClientTable };
