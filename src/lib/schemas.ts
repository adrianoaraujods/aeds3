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
  street: z.string(),
  country: z.string(),
  city: z.string(),
  state: z.string(),
  number: z.string(),
  district: z.string().optional(),
  complement: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema>;
export const clientSchema = z.object({
  id: int32().positive(), // primary key
  document: z // CNPJ | CPF
    .string()
    .min(11)
    .max(14)
    .transform((string) => formatNumber(string)),
  registration: z // Inscrição Estatual
    .string()
    .min(9)
    .max(13)
    .transform((string) => formatNumber(string)),
  socialName: z.string(), // Razão Social
  name: z.string(),
  email: z.email(),
  cellphone: z
    .string()
    .min(10)
    .transform((string) => formatNumber(string)),
  payment: z.number().min(0).max(255),
  currency: z.enum([...CURRENCIES]),
  address: addressSchema,
});

export type Drawing = z.infer<typeof drawingSchema>;
export const drawingSchema = z.object({
  id: int32().positive(), // primary key
  number: z.string(),
  url: z.string(),
});

export type Product = z.infer<typeof productSchema>;
export const productSchema = z.object({
  id: int32().positive(), // primary key
  code: z.string(),
  description: z.string(),
  unit: z.enum([...UNITS]),

  drawings: z.array(z.int32().positive()), // foreign key from Drawing
});

export type Order = z.infer<typeof orderSchema>;
export const orderSchema = z.object({
  id: int32().positive(), // primary key
  number: z.string(),
  date: z.date(),
  total: z.number(), // sum of all items price times the amount
  state: z.enum([...STATES]),

  clientId: z.int32().positive(), // foreign key from Client
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export const orderItemSchema = z.object({
  id: int32().positive(), // primary key
  item: z.string(),
  deliver: z.date(),
  price: z.number(),
  amount: z.number(),

  productId: z.int32().positive(), // foreign key from Product
  orderId: z.int32().positive(), // foreign key from Order
});
