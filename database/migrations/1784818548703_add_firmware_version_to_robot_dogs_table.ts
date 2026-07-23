import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'robot_dogs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('firmware_version').notNullable().defaultTo('1.0.0')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('firmware_version')
    })
  }
}
