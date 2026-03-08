import type { ActionId } from '../value-objects/action-id.js'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import type Action from '#app/modules/actions/domain/action.entity'

export abstract class ActionRepository {
  abstract findById(id: ActionId): Promise<Action | null>

  abstract findByCode(code: string): Promise<Action | null>

  abstract index(options?: PaginationDto): Promise<PaginatedResult<Action>>

  abstract save(action: Action): Promise<void>

  abstract delete(id: ActionId): Promise<void>
}
