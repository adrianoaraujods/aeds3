import z from "zod";

import { formatNumber } from "@/lib/utils";

export type Currency = (typeof CURRENCIES)[number];
export const CURRENCIES = ["BRL", "USD"] as const;

export const CURRENCIES_LABELS: { [currency in Currency]: string } = {
  BRL: "Real",
  USD: "Dólar",
};

export type Address = z.infer<typeof addressSchema>;
export const addressSchema = z.object({
  street: z.string().min(1, "Esse campo deve ser preenchido."),
  country: z.string().min(1, "Esse campo deve ser preenchido."),
  city: z.string().min(1, "Esse campo deve ser preenchido."),
  state: z.string().min(1, "Esse campo deve ser preenchido."),
  number: z.string().min(1, "Esse campo deve ser preenchido."),
  district: z.string().optional(),
  complement: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema>;
export const clientSchema = z.object({
  id: z.uint32(), // primary key
  document: z // CNPJ | CPF
    .string()
    .min(11, "Esse campo deve ter pelo menos 11 dígitos.")
    .max(14, "Esse campo deve ter no máximo 14 dígitos.")
    .transform((string) => formatNumber(string)),
  registration: z // Inscrição Estatual
    .string()
    .min(9, "Esse campo deve ter pelo menos 9 dígitos.")
    .max(13, "Esse campo deve ter no máximo 13 dígitos.")
    .transform((string) => formatNumber(string)),
  socialName: z.string(), // Razão Social
  name: z.string().min(1, "Esse campo deve ser preenchido."),
  email: z.email("Email inválido."),
  cellphone: z
    .string()
    .min(10, "Um telefone deve ter pelo menos 10 dígitos.")
    .transform((string) => formatNumber(string)),
  payment: z
    .int("Esse campo deve ser preenchido.")
    .min(0, "A condição de pagamento não pode ser menor que zero.")
    .max(255, {
      error: "A condição de pagamento não pode ser maior que 255 dias.",
    }),
  currency: z.enum([...CURRENCIES], "Moeda inválida."),
  address: addressSchema,
});

export type ClientData = z.infer<typeof clientDataSchema>;
export const clientDataSchema = clientSchema.extend({ id: z.int32() });

export const DEFAULT_CLIENT: ClientData = {
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
