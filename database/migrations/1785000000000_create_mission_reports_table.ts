import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_reports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_run_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('mission_runs')
        .onDelete('CASCADE')
      table
        .uuid('robot_dog_id')
        .notNullable()
        .references('id')
        .inTable('robot_dogs')
        .onDelete('CASCADE')
      table.string('status').notNullable()
      table.string('gcs_object_path').nullable()
      // text (not varchar(255)): the Rust worker sets this from anyhow::Error chains
      // (GCS/HTTP errors, context chains), which can exceed 255 chars. A DB error here
      // would nack the AMQP message and permanently discard it (report stuck PENDING).
      table.text('failure_reason').nullable()
      table.timestamp('requested_at').notNullable()
      table.timestamp('completed_at').nullable()

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
