import type { HttpContext } from '@adonisjs/core/http'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface ParsePaginationParamsOptions {
  defaultLimit?: number
}

/**
 * Lit `page`/`limit`/`search` depuis la query string avec des defaults et un
 * clamping cohérents ([1, +inf) pour page, [1, 100] pour limit). Remplace le
 * pattern dupliqué et incohérent réimplémenté dans ~10 contrôleurs.
 */
export function parsePaginationParams(
  request: HttpContext['request'],
  options: ParsePaginationParamsOptions = {}
): PaginationDto {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT

  const rawPage = Number(request.input('page', 1))
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1

  const rawLimit = Number(request.input('limit', defaultLimit))
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(1, Math.trunc(rawLimit)), MAX_LIMIT)
    : defaultLimit

  const search = (request.input('search') as string | undefined) || undefined

  return { page, limit, search }
}
