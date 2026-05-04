import { cn } from '@/lib/utils'

// --- Types ------------------------------------------------------

type Column<T> = {
  key:        keyof T | '_actions'
  label:      string
  render?:    (value: T[keyof T] | undefined, row: T) => React.ReactNode
  className?: string
}

type Props<T> = {
  columns:      Column<T>[]
  data:         T[]
  loading?:     boolean
  caption?:     string
  count?:       number
  countLabel?:  string
  onRowClick?:  (row: T) => void
}

// --- Component -------------------------------------------------

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  caption,
  count,
  countLabel,
  onRowClick,
}: Props<T>) {
  const hasHeader = caption !== undefined || count !== undefined

  return (
    <div className="rounded-lg border border-zinc-200 shadow-md">

      {/* Card header */}
      {hasHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          {caption && (
            <p className="text-sm font-bold text-zinc-900">{caption}</p>
          )}
          {count !== undefined && (
            <p className="text-xs font-medium text-zinc-400 ml-auto">
              {count} {countLabel}
            </p>
          )}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-2.5 text-left text-xs font-bold text-zinc-400 whitespace-nowrap',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm font-medium text-zinc-400"
              >
                Loading...
              </td>
            </tr>
          )}

          {!loading && data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm font-medium text-zinc-400"
              >
                No data.
              </td>
            </tr>
          )}

          {!loading &&
            data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'hover:bg-zinc-50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => {
                  const value =
                    col.key === '_actions'
                      ? undefined
                      : row[col.key as keyof T]

                  return (
                    <td
                      key={String(col.key)}
                      className={cn('px-4 py-2.5 whitespace-nowrap font-semibold text-zinc-900', col.className)}
                    >
                      {col.render
                        ? col.render(value, row)
                        : String(value ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}