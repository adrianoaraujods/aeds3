import z from "zod";

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
  number: z.string(), // CNPJ | CPF
  socialName: z.string(),
  name: z.string(),
  email: z.string(),
  cellphone: z.string(),
  payment: z.number(),
  currency: z.enum([...CURRENCIES]),
  address: addressSchema,
});

export type Drawing = z.infer<typeof drawingSchema>;
export const drawingSchema = z.object({
  id: z.string(), // primary key
  code: z.string(),
  url: z.string().optional(),
});

export type Product = z.infer<typeof productSchema>;
export const productSchema = z.object({
  id: z.string(), // primary key
  code: z.string(),
  description: z.string(),
  unit: z.enum([...UNITS]),
  drawings: z.array(z.string()), // foreign key from Drawing
});

export type Order = z.infer<typeof orderSchema>;
export const orderSchema = z
  .object({
    client: z.string(), // foreign key from Client
    number: z.string(), // primary key
    date: z.number(), // transform to Date from epoch milliseconds
    total: z.number(), // sum of all items price times the amount
    state: z.enum([...STATES]),
    items: z.array(z.string()), // OrderItem primary key
  })
  .transform(({ date, ...order }) => ({
    ...order,
    date: new Date(date),
  }));

export type OrderItem = z.infer<typeof orderItemSchema>;
export const orderItemSchema = z
  .object({
    order: z.string(), // foreign key from Order
    item: z.string(), // primary key
    deliver: z.number(), // transform to Date from epoch milliseconds
    product: z.string(), // foreign key from Product
    client: z.string(), // foreign key from Client
    price: z.number(),
    amount: z.number(),
  })
  .transform(({ deliver, ...order }) => ({
    ...order,
    deliver: new Date(deliver),
  }));
