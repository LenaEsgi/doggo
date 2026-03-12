import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, manyToMany } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import { UserRole } from '#users/domain/enums/user.role'

export default class UserModel extends BaseModel {
  public static table = 'users'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'firebase_uid' })
  declare firebaseUid: string

  @column()
  declare firstname: string

  @column()
  declare lastname: string

  @column()
  declare email: string

  @column()
  declare role: UserRole

  @manyToMany(() => RobotDogModel, {
    pivotTable: 'ownerships',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'robot_dog_id',
    pivotColumns: ['start_date', 'end_date'],
  })
  declare robotDogs: ManyToMany<typeof RobotDogModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(user: UserModel) {
    user.id = randomUUID()
  }
}
