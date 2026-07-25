import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import UserModel from '#users/infrastructure/database/models/user'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'

export default class MissionModel extends BaseModel {
  public static table = 'missions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @manyToMany(() => RobotDogModel, {
    pivotTable: 'mission_robot_dog',
    localKey: 'id',
    pivotForeignKey: 'mission_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'robot_dog_id',
  })
  declare robotDogs: ManyToMany<typeof RobotDogModel>

  @hasMany(() => MissionStepModel, {
    foreignKey: 'missionId',
  })
  declare steps: HasMany<typeof MissionStepModel>

  @column()
  declare userId: string

  @belongsTo(() => UserModel, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof UserModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
