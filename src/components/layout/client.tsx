"use client";

import * as React from "react";
import Link from "next/link";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { email } from "zod";

import { useAppForm } from "@/hooks/use-app-form";
import { useData } from "@/hooks/use-data";
import { CURRENCIES } from "@/lib/schemas";
import { formatCNPJ, formatCPF } from "@/lib/utils";
import { createClient, deleteClient, updateClient } from "@/actions/client";
import { SelectOption } from "@/components/layout/form";
import { DataTable } from "@/components/table/data-table";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EllipsisIcon, EyeIcon, Trash2Icon } from "lucide-react";

import type { Client, Currency } from "@/lib/schemas";

const currencies: { [currency in Currency]: Omit<SelectOption, "value"> } = {
  BRL: { title: "Real" },
  USD: { title: "Dólar" },
};

type ClientFormProps = {
  initialValues: Client;
  type: "create" | "edit";
  canEdit?: boolean;
  setCanEdit?: React.Dispatch<React.SetStateAction<boolean>>;
};

function ClientForm({
  initialValues,
  type,
  canEdit,
  setCanEdit,
}: ClientFormProps) {
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

  async function handleCreate(client: Omit<Client, "id">) {
    const res = await createClient(client);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        clients: [...prev.clients, res.data],
      }));

      toast.success("Cliente criado com sucesso!", {
        action: (
          <Button asChild>
            <Link href={`/clientes/${res.data.id}`}>Abrir</Link>
          </Button>
        ),
      });

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o cliente. Confira os dados do cliente."
        );
        break;
      case 409:
        toast.warning("Esse cliente já existe do cliente.");
        break;
      case 509:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível salvar o cliente."
        );
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o cliente, tente novamente."
        );
        break;
    }
  }

  async function handleEdit(client: Client) {
    const res = await updateClient(client);

    if (res.ok) {
      setData((prev) => {
        const clients = [...prev.clients];

        for (let i = 0; i < clients.length; i++) {
          if (clients[i].id === initialValues.id) {
            clients[i] = res.data;
            break;
          }
        }

        return { ...prev, clients };
      });

      if (setCanEdit) {
        setCanEdit(false);
      }

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
        toast.warning("Esse cliente não foi encontrado.");
        break;
      case 409:
        toast.warning("Já existe algum cliente com esses dados.");
        break;
      case 509:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível salvar o cliente."
        );
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o cliente, tente novamente."
        );
        break;
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="grid gap-x-4 gap-y-1 lg:grid-cols-2 xl:grid-cols-[5fr_3fr_3fr_2fr]">
        <form.AppField
          name="name"
          validators={{
            onSubmit: ({ value }) => {
              if (value.length < 1) {
                return "Campo obrigatório";
              }
            },
          }}
          children={(field) => (
            <field.TextField
              label="Nome"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="document"
          validators={{
            onSubmit: ({ value }) => {
              if (value.length < 9) {
                return "CPF inválido";
              } else if (value.length > 11 && value.length < 14) {
                return "CPNJ inválido";
              }
            },
          }}
          children={(field) => (
            <field.DocumentNumberField
              label="CPNJ / CPF"
              placeholder="00.000.000/0000-00"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="registration"
          validators={{
            onSubmit: ({ value }) => {
              if (value.length < 9 || value.length > 13) {
                return "Instrição estadual inválida";
              }
            },
          }}
          children={(field) => (
            <field.TextField
              label="Inscrição Estadual"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="payment"
          validators={{
            onSubmit: ({ value }) => {
              if (value < 0 || value > 255) {
                return "Condição de pagamento inválida";
              }
            },
          }}
          children={(field) => (
            <field.TextField
              label="Condições de Pagamento"
              placeholder="30"
              type="number"
              min={0}
              max={255}
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="socialName"
          validators={{
            onSubmit: ({ value }) => {
              if (value.length < 1) {
                return "Campo obrigatório";
              }
            },
          }}
          children={(field) => (
            <field.TextField
              label="Razão Social"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="email"
          validators={{
            onSubmit: ({ value }) => {
              const parser = email().safeParse(value);

              if (!parser.success) {
                return "Email inválido";
              }
            },
          }}
          children={(field) => (
            <field.TextField
              label="E-mail"
              type="email"
              placeholder="contato@empresa.com"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="cellphone"
          validators={{
            onSubmit: ({ value }) => {
              if (value.length < 8) {
                return "Telefone inválido";
              }
            },
          }}
          children={(field) => (
            <field.PhoneField
              label="Telefone"
              placeholder="(31) 3000-0000"
              disabled={canEdit === false}
              required
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
              triggerProps={{ disabled: canEdit === false }}
            />
          )}
        />
      </div>

      <div className="grid gap-2">
        <Heading element="span" className="mb-2 border-b">
          Endereço
        </Heading>

        <div className="xl: grid gap-x-4 gap-y-1">
          <div className="grid gap-x-4 gap-y-1 lg:grid-cols-3">
            <form.AppField
              name="address.country"
              validators={{
                onSubmit: ({ value }) => {
                  if (value.length < 1) {
                    return "Campo obrigatório";
                  }
                },
              }}
              children={(field) => (
                <field.TextField
                  label="País"
                  disabled={canEdit === false}
                  required
                />
              )}
            />

            <form.AppField
              name="address.state"
              validators={{
                onSubmit: ({ value }) => {
                  if (value.length < 1) {
                    return "Campo obrigatório";
                  }
                },
              }}
              children={(field) => (
                <field.TextField
                  label="Estado"
                  disabled={canEdit === false}
                  required
                />
              )}
            />

            <form.AppField
              name="address.city"
              validators={{
                onSubmit: ({ value }) => {
                  if (value.length < 1) {
                    return "Campo obrigatório";
                  }
                },
              }}
              children={(field) => (
                <field.TextField
                  label="Cidade"
                  disabled={canEdit === false}
                  required
                />
              )}
            />
          </div>

          <div className="grid gap-x-4 gap-y-1 lg:grid-cols-4">
            <form.AppField
              name="address.district"
              children={(field) => (
                <field.TextField
                  label="Bairro"
                  disabled={canEdit === false}
                  required
                />
              )}
            />

            <form.AppField
              name="address.street"
              validators={{
                onSubmit: ({ value }) => {
                  if (value.length < 1) {
                    return "Campo obrigatório";
                  }
                },
              }}
              children={(field) => (
                <field.TextField
                  label="Logradouro"
                  disabled={canEdit === false}
                  required
                />
              )}
            />

            <form.AppField
              name="address.number"
              validators={{
                onSubmit: ({ value }) => {
                  if (value.length < 1) {
                    return "Campo obrigatório";
                  }
                },
              }}
              children={(field) => (
                <field.TextField
                  label="Número"
                  disabled={canEdit === false}
                  required
                />
              )}
            />

            <form.AppField
              name="address.complement"
              children={(field) => (
                <field.TextField
                  label="Complemento"
                  disabled={canEdit === false}
                  required
                />
              )}
            />
          </div>
        </div>
      </div>

      {(type === "create" || canEdit) && (
        <footer className="flex flex-row-reverse gap-2">
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
              form.reset();

              if (setCanEdit) {
                setCanEdit(false);
              }
            }}
            variant="outline"
            type="reset"
          >
            Cancelar
          </Button>
        </footer>
      )}
    </form>
  );
}

function ClientTable() {
  const { data } = useData();

  const table = useReactTable<Client>({
    columns: [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "socialName", header: "Razão Social" },
      {
        accessorKey: "document",
        header: "CPNJ / CPF",
        cell: ({ getValue }) => {
          const value: string = getValue();

          return (
            <span className="font-mono">
              {value.length === 14 ? formatCNPJ(value) : formatCPF(value)}
            </span>
          );
        },
      },
      {
        accessorKey: "registration",
        header: "Inscrição Estadual",
        cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
      },
      {
        accessorKey: "payment",
        header: "Condições de Pagamento",
        cell: ({ getValue }) => `${getValue()} dias`,
      },
      {
        accessorKey: "more",
        header: "",
        cell: ({ row }) => <ClientTableRowMenu client={row.original} />,
      },
    ],
    data: data.clients,
    getCoreRowModel: getCoreRowModel(),
  });

  return <DataTable table={table} />;
}

function ClientTableRowMenu({ client }: { client: Client }) {
  const { setData } = useData();

  async function handleDelete() {
    const res = await deleteClient(client.id);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        clients: prev.clients.filter(({ id }) => id !== client.id),
      }));

      toast.success("Cliente deletado com sucesso!");
      return;
    }

    switch (res.status) {
      case 409:
        toast.warning(
          "Não é possível excluir um cliente com outros registros."
        );
        break;
      case 500:
        toast.error(
          "Erro interno do servidor. Não foi possível excluir o cliente, tente novamente."
        );
        break;
      default:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível excluir o cliente."
        );
    }
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline">
            <EllipsisIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`/clientes/${client.id}`}>
                <EyeIcon />

                <Text>Ver</Text>
              </Link>
            </DropdownMenuItem>

            <AlertDialogTrigger asChild>
              <DropdownMenuItem variant="destructive">
                <Trash2Icon />

                <Text>Deletar</Text>
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso irá excluir permanentemente esse cliente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" asChild>
            <AlertDialogAction onClick={() => handleDelete()}>
              Excluir
            </AlertDialogAction>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ClientForm, ClientTable };
