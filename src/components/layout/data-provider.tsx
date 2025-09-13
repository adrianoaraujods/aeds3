"use client";

import * as React from "react";

import { DataContext } from "@/hooks/use-data";

import type { Data } from "@/actions/data";

const defaultData: Data = {
  clients: [],
  orders: [],
  products: [],
};

function DataProvider({
  initialData,
  children,
}: {
  initialData: Promise<Data | null>;
  children: React.ReactNode;
}) {
  const [data, setData] = React.useState<Data>(
    React.use(initialData) || defaultData
  );

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
}

export { DataProvider };
