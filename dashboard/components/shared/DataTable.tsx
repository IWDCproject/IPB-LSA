import { cn } from '@/lib/utils'

type Column<T> = {
  key: keyof T | '_actions'
  label: string
  render?: (value: T[keyof T] | undefined, row: T) => React.ReactNode
  className?: string
}

type Props<T> = {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  caption?: string
  count?: number
  countLabel?: string
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  caption,
  count,
  countLabel,
}: Props<T>) {
  return (
    <div className="space-y-2">
      {(caption || count !== undefined) && (
        <div className="flex items-center justify-between">
          {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
          {count !== undefined && (
            <p className="text-sm text-muted-foreground">
              {count} {countLabel}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-muted-foreground',
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
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            )}

            {!loading && data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No data.
                </td>
              </tr>
            )}

            {!loading &&
              data.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  {columns.map((col) => {
                    const value = col.key === '_actions'
                      ? undefined
                      : row[col.key as keyof T]

                    return (
                      <td
                        key={String(col.key)}
                        className={cn('px-4 py-3', col.className)}
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
    </div>
  )
}