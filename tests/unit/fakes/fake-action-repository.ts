import { type ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import type Action from '#app/modules/actions/domain/action.entity'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { type ActionId } from '#app/modules/actions/domain/value-objects/action-id'

export class FakeActionRepository implements ActionRepository {
  public actions: Action[] = []

  async findById(id: ActionId): Promise<Action | null> {
    return this.actions.find((a) => a.id.value === id.value) || null
  }

  async findByCode(code: string): Promise<Action | null> {
    return this.actions.find((a) => a.code === code) || null
  }

  async index(options?: PaginationDto): Promise<PaginatedResult<Action>> {
    const page = options?.page || 1
    const limit = options?.limit || 10
    const start = (page - 1) * limit
    const end = start + limit

    const items = this.actions.slice(start, end)

    return {
      data: items,
      meta: {
        total: this.actions.length,
        perPage: limit,
        currentPage: page,
        lastPage: Math.ceil(this.actions.length / limit),
        firstPage: 1,
      },
    }
  }

  async save(action: Action): Promise<void> {
    const index = this.actions.findIndex((a) => a.id.value === action.id.value)

    if (index !== -1) {
      this.actions[index] = action
    } else {
      this.actions.push(action)
    }
  }

  async delete(id: ActionId): Promise<void> {
    this.actions = this.actions.filter((a) => a.id.value !== id.value)
  }
}
