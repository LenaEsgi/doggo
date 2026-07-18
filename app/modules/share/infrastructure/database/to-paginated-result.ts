import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

interface Paginated<TRow> {
  all(): TRow[]
  total: number
  perPage: number
  currentPage: number
  firstPage: number
  lastPage: number
}

export function toPaginatedResult<TRow, TDomain>(
  paginator: Paginated<TRow>,
  map: (row: TRow) => TDomain
): PaginatedResult<TDomain> {
  return {
    data: paginator.all().map(map),
    meta: {
      total: paginator.total,
      perPage: paginator.perPage,
      currentPage: paginator.currentPage,
      firstPage: paginator.firstPage,
      lastPage: paginator.lastPage,
    },
  }
}
