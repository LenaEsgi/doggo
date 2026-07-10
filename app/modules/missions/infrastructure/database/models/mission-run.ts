import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionRunStepModel from '#app/modules/missions/infrastructure/database/models/mission-run-step'

export default class MissionRunModel extends BaseModel {
  public static table = 'mission_runs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionId: string

  @column()
  declare robotDogId: string

  @column()
  declare status: MissionRunStatus

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare endedAt: DateTime | null

  @hasMany(() => MissionRunStepModel, { foreignKey: 'missionRunId' })
  declare runSteps: HasMany<typeof MissionRunStepModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
