import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_run_steps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('sequence_order').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sequence_order')
    })
  }
}
