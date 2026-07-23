import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'robot_dogs'

  async up() {
    this.schema.raw(`ALTER TABLE ${this.tableName} DROP CONSTRAINT robot_dogs_battery_level_check`)
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT robot_dogs_battery_level_check CHECK (battery_level >= 0)`
    )
  }

  async down() {
    this.schema.raw(`ALTER TABLE ${this.tableName} DROP CONSTRAINT robot_dogs_battery_level_check`)
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT robot_dogs_battery_level_check CHECK (battery_level > 0)`
    )
  }
}
