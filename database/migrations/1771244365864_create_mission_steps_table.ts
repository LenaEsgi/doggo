import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_steps'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('mission_id').references('id').inTable('missions').onDelete('CASCADE')
      table.uuid('action_id').references('id').inTable('actions').onDelete('CASCADE')

      table.integer('sequence_order').notNullable()
      table.jsonb('parameters').notNullable()
      table.string('status').notNullable()

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
