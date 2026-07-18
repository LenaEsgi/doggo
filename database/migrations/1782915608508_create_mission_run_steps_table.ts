import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_run_steps'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_run_id')
        .notNullable()
        .references('id')
        .inTable('mission_runs')
        .onDelete('CASCADE')
      table
        .uuid('mission_step_id')
        .notNullable()
        .references('id')
        .inTable('mission_steps')
        .onDelete('CASCADE')
      table.string('status').notNullable()

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
