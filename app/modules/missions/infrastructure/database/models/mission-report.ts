import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'

export default class MissionReportModel extends BaseModel {
  public static table = 'mission_reports'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionRunId: string

  @column()
  declare robotDogId: string

  @column()
  declare status: MissionReportStatus

  @column()
  declare gcsObjectPath: string | null

  @column()
  declare failureReason: string | null

  @column.dateTime()
  declare requestedAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
