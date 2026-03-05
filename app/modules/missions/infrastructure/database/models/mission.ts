import { BaseModel, column, hasMany, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import type { HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'
import UserModel from '#users/infrastructure/database/models/user'
import { MissionStatus } from '#app/modules/missions/domain/enums/mission-status'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'

export default class MissionModel extends BaseModel {
  public static table = 'missions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare status: MissionStatus

  @manyToMany(() => RobotDogModel)
  declare robotDogs: ManyToMany<typeof RobotDogModel>

  @hasMany(() => MissionStepModel, {
    foreignKey: 'missionId',
  })
  declare steps: HasMany<typeof MissionStepModel>

  @column()
  declare userId: string

  @hasOne(() => UserModel)
  declare user: HasOne<typeof UserModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
