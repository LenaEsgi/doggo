import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_steps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('status').notNullable().defaultTo('PENDING')
    })
  }
}
