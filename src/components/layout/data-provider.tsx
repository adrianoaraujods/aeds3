"use client";

import * as React from "react";

import { toast } from "sonner";

import { DataContext } from "@/hooks/use-data";

import type { Data } from "@/actions/data";
import type { ActionResponse } from "@/lib/config";

function DataProvider({
  initialData,
  children,
}: {
  initialData: Promise<ActionResponse<Data> & { data: Data }>;
  children: React.ReactNode;
}) {
  const res = React.use(initialData);

  const [data, setData] = React.useState<Data>(res.data);

  React.useEffect(() => {
    if (res.status === 509) {
      toast.warning("Existem dados corrompidos no Banco de Dados.");
    } else if (res.status === 500) {
      toast.error("Houve algum erro interno no servidor.");
    }
  }, [res.status]);

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
}

export { DataProvider };
