import { type ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import Action from '#app/modules/actions/domain/action.entity'
import { type ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import db from '@adonisjs/lucid/services/db'

export class ActionRepositoryImplementation implements ActionRepository {
  async findById(id: ActionId): Promise<Action | null> {
    const row = await ActionModel.find(id.value)
    if (!row) return null
    return Action.rehydrate(
      row.id,
      row.code,
      row.name,
      row.slug,
      row.description,
      row.parameterSchema ?? null
    )
  }

  async findByCode(code: string): Promise<Action | null> {
    const row = await ActionModel.query().where('code', code.toUpperCase()).first()
    if (!row) return null
    return Action.rehydrate(
      row.id,
      row.code,
      row.name,
      row.slug,
      row.description,
      row.parameterSchema ?? null
    )
  }

  async index(options?: PaginationDto): Promise<PaginatedResult<Action>> {
    const page = options?.page ?? 1
    const perPage = options?.limit ?? 10

    const paginator = await ActionModel.query().orderBy('id', 'desc').paginate(page, perPage)

    const data = paginator.all().map((row) => {
      return Action.rehydrate(
        row.id,
        row.code,
        row.name,
        row.slug,
        row.description,
        row.parameterSchema ?? null
      )
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
          parameterSchema: action.parameterSchema,
        },
        { client: trx }
      )
    })
  }

  async delete(id: ActionId): Promise<void> {
    const row = await ActionModel.find(id.value)
    if (!row) return
    await row.delete()
  }
}
