"use client";

import * as React from "react";
import Link from "next/link";

import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";

import { useAppForm } from "@/hooks/use-app-form";
import { createClient, updateClient } from "@/actions/client";
import { Heading } from "@/components/typography/heading";
import { Button } from "@/components/ui/button";
import {
  clientDataSchema,
  CURRENCIES,
  CURRENCIES_LABELS,
} from "@/schemas/client";

import type { Client, ClientData, Currency } from "@/schemas/client";

type ClientFormProps = {
  initialValues: ClientData;
  type: "create" | "edit";
  canEdit?: boolean;
  setCanEdit?: React.Dispatch<React.SetStateAction<boolean>>;
};

// TODO: `form.reset()` not updating `cellphone` and `document` fields

export function ClientForm({
  initialValues,
  type,
  canEdit,
  setCanEdit,
}: ClientFormProps) {
  const form = useAppForm({
    defaultValues: initialValues,
    validationLogic: revalidateLogic({ modeAfterSubmission: "blur" }),
    validators: { onDynamic: clientDataSchema },
    onSubmit: async ({ value }) => {
      if (type === "create") {
        handleCreate(value);
      } else {
        handleEdit(value);
      }
    },
  });

  async function handleCreate(client: ClientData) {
    const creatingClient = await createClient(client);

    if (creatingClient.ok) {
      const newClient = creatingClient.data;

      toast.success(creatingClient.message, {
        action: (
          <Button className="ml-auto" variant="outline" asChild>
            <Link href={`/clientes/${newClient.id}`}>Abrir</Link>
          </Button>
        ),
      });

      form.reset();
      return;
    }

    if (creatingClient.status < 500) {
      toast.warning(creatingClient.message);
      return;
    }

    toast.error(creatingClient.message, {
      action: (
        <Button onClick={() => handleCreate(client)}>Tente novamente</Button>
      ),
    });
  }

  async function handleEdit(client: Client) {
    const updatingClient = await updateClient(client);

    if (updatingClient.ok) {
      toast.success(updatingClient.message);

      if (setCanEdit) setCanEdit(false);
      return;
    }

    if (updatingClient.status < 500) {
      toast.warning(updatingClient.message);
      return;
    }

    toast.error(updatingClient.message, {
      action: (
        <Button onClick={() => handleEdit(client)}>Tente novamente</Button>
      ),
    });
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
              options={Object.keys(CURRENCIES_LABELS).map((currency) => ({
                value: currency,
                title: CURRENCIES_LABELS[currency as Currency],
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
          <div className="grid items-start gap-x-4 gap-y-1 lg:grid-cols-3">
            <form.AppField
              name="address.country"
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
              children={(field) => (
                <field.TextField
                  label="Cidade"
                  disabled={canEdit === false}
                  required
                />
              )}
            />
          </div>

          <div className="grid items-start gap-x-4 gap-y-1 lg:grid-cols-4">
            <form.AppField
              name="address.district"
              children={(field) => (
                <field.TextField label="Bairro" disabled={canEdit === false} />
              )}
            />

            <form.AppField
              name="address.street"
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
