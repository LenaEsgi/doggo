import { type ActionRepository } from '../../../domain/contracts/action.repository.js'
import Action from '../../../domain/action.entity.js'
import { type ActionId } from '../../../domain/value-objects/action-id.js'
import ActionModel from '../models/action.js'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import db from '@adonisjs/lucid/services/db'

export class ActionRepositoryImplementation implements ActionRepository {
  async findById(id: ActionId): Promise<Action | null> {
    const row = await ActionModel.find(id.value)
    if (!row) return null

    // TODO: Use your Action.rehydrate() method here
    // return Action.rehydrate(row)
    return null as any
  }

  async findByCode(code: string): Promise<Action | null> {
    const row = await ActionModel.query().where('code', code.toUpperCase()).first()

    if (!row) return null

    return Action.rehydrate(row.id, row.code, row.name, row.slug, row.description)
  }

  async index(options?: PaginationDto): Promise<PaginatedResult<Action>> {
    const page = options?.page ?? 1
    const perPage = options?.limit ?? 10

    const paginator = await ActionModel.query().orderBy('id', 'desc').paginate(page, perPage)

    const data = paginator.all().map((_row) => {
      // TODO: Use your Action.rehydrate() method here
      return null as any
    })

    return {
      data,
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        firstPage: paginator.firstPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async save(action: Action): Promise<void> {
    await db.transaction(async (trx) => {
      await ActionModel.updateOrCreate(
        { id: action.id.value },
        {
          slug: action.slug,
          description: action.description,
          code: action.code,
          name: action.name,
        },
        { client: trx }
      )
    })
  }

  async delete(id: ActionId): Promise<void> {
    const row = await ActionModel.findOrFail(id.value)
    await row.delete()
  }
}
