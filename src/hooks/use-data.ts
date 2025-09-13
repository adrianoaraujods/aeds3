import * as React from "react";

import type { Data } from "@/actions/data";

const DataContext = React.createContext<{
  data: Data;
  setData: React.Dispatch<React.SetStateAction<Data>>;
} | null>(null);

function useData() {
  const data = React.useContext(DataContext);

  if (!data) throw "useData must be used within a DataProvider";

  return data;
}

export { DataContext, useData };
