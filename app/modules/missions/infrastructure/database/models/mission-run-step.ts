import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'

export default class MissionRunStepModel extends BaseModel {
  public static table = 'mission_run_steps'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionRunId: string

  @column()
  declare missionStepId: string

  @column()
  declare status: MissionStepStatus

  @belongsTo(() => MissionRunModel, { foreignKey: 'missionRunId' })
  declare missionRun: BelongsTo<typeof MissionRunModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
