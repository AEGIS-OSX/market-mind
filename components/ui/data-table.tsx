"use client";

export type Column<T> = { key: keyof T; label: string };

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
}: {
  columns: Column<T>[];
  rows: T[];
}) {
  return (
    <table className="w-full text-sm" style={{ color: 'var(--color-text)' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          {columns.map((c) => (
            <th key={String(c.key)} className="px-3 py-2 text-left font-medium">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
            {columns.map((c) => (
              <td key={String(c.key)} className="px-3 py-2">
                {String(row[c.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
