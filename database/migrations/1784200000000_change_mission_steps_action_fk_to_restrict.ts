import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_steps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('action_id')
      table.foreign('action_id').references('id').inTable('actions').onDelete('RESTRICT')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('action_id')
      table.foreign('action_id').references('id').inTable('actions').onDelete('CASCADE')
    })
  }
}
