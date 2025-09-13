import { flexRender } from "@tanstack/react-table";

import {
  TableBody,
  TableCaption,
  TableCell,
  Table as TableComponent,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Table } from "@tanstack/react-table";

function DataTable<TData>({ table }: { table: Table<TData> }) {
  const { rows } = table.getRowModel();

  return (
    <div className="relative overflow-hidden rounded-md border">
      <div className="flex h-full max-h-[680px] flex-col">
        <TableComponent>
          <TableHeader className="bg-secondary text-secondary-foreground sticky top-0 z-50">
            {table.getHeaderGroups().map((row) => (
              <TableRow key={row.id}>
                {row.headers.map((header) =>
                  header.isPlaceholder ? null : (
                    <TableHead
                      key={header.id}
                      className="text-center whitespace-nowrap"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  )
                )}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>

          {rows.length === 0 && (
            <TableCaption className="px-4 pb-4 text-left">
              Nenhum resultado encontrado.
            </TableCaption>
          )}
        </TableComponent>
      </div>
    </div>
  );
}

export { DataTable };
