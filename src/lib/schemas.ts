import z, { int32 } from "zod";

import { formatNumber } from "./utils";

export type State = (typeof STATES)[number];
export const STATES = [
  "Completo",
  "Atrasado",
  "Andamento",
  "Cancelado",
] as const;

export type Unit = (typeof UNITS)[number];
export const UNITS = ["UN", "PÇ", "PR"] as const;

export type Currency = (typeof CURRENCIES)[number];
export const CURRENCIES = ["BRL", "USD"] as const;

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
  id: int32().positive(), // primary key
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
    .number("Esse campo deve ser preenchido.")
    .min(0, "A condição de pagamento não pode ser menor que zero.")
    .max(255, {
      error: "A condição de pagamento não pode ser maior que 255 dias.",
    }),
  currency: z.enum([...CURRENCIES], "Moeda inválida."),
  address: addressSchema,
});

export type Drawing = z.infer<typeof drawingSchema>;
export const drawingSchema = z.object({
  id: int32().positive(), // primary key
  number: z.string().min(1, "Esse campo deve ser preenchido."),
  url: z.string().optional(),
});

export type Product = z.infer<typeof productSchema>;
export const productSchema = z.object({
  id: int32().positive(), // primary key
  code: z.string().min(1, "Esse campo deve ser preenchido."),
  description: z.string().min(1, "Esse campo deve ser preenchido."),
  unit: z.enum([...UNITS], "Unidade de medida inválida."),

  drawings: z.array(z.int32().positive()), // foreign key from Drawing
});

export type Order = z.infer<typeof orderSchema>;
export const orderSchema = z.object({
  id: int32().positive(), // primary key
  number: z.string().min(1, "Esse campo deve ser preenchido."),
  date: z.date("Data inválida."),
  total: z.number(), // sum of all items price times the amount
  state: z.enum([...STATES]),

  clientId: z.int32().positive(), // foreign key from Client
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export const orderItemSchema = z.object({
  id: int32().positive(), // primary key
  item: z.string().min(1, "Esse campo deve ser preenchido."),
  deliver: z.date("Data inválida."),
  price: z.number().positive("Preço inválido."),
  amount: z.number().positive("Quantidade inválida."),

  productId: z.int32().positive(), // foreign key from Product
  orderId: z.int32().positive(), // foreign key from Order
});
