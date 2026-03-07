import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

export default class MissionStepModel extends BaseModel {
  public static table = 'mission_steps'

  @column({ isPrimary: true })
  declare id: string

  @belongsTo(() => MissionModel)
  declare mission: BelongsTo<typeof MissionModel>

  @column()
  declare missionId: string

  @column()
  declare actionId: string

  @column()
  declare sequenceOrder: number

  @column()
  declare parameters: string

  @column()
  declare status: MissionStepStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
