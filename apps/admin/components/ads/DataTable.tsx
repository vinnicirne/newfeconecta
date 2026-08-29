import React from "react";
import { Loader2 } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "Nenhum registro encontrado.",
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/50">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          <span className="text-xs">Carregando dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-5 py-3.5 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-zinc-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-5 py-4 align-middle ${col.className || ""}`}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? "-")
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-zinc-400 bg-white/[0.01]">
          <span>
            Página {pagination.currentPage} de {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="rounded-lg border border-white/10 px-3 py-1 text-zinc-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="rounded-lg border border-white/10 px-3 py-1 text-zinc-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
