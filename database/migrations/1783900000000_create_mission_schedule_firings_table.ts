import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_schedule_firings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_schedule_id')
        .notNullable()
        .references('id')
        .inTable('mission_schedules')
        .onDelete('CASCADE')
      table.timestamp('fired_for_minute').notNullable()
      table
        .uuid('mission_run_id')
        .nullable()
        .references('id')
        .inTable('mission_runs')
        .onDelete('SET NULL')
      table.string('outcome').nullable()
      table.unique(['mission_schedule_id', 'fired_for_minute'])

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
