import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'robot_dogs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('serial_number').notNullable().unique()
      table.string('key').notNullable().unique()
      table.string('name').notNullable()

      table
        .enum('state', ['IDLE', 'IN_SESSION', 'IN_MISSION', 'OFFLINE', 'ERROR', 'CHARGING'])
        .notNullable()
        .defaultTo('OFFLINE')
      table.integer('battery_level').notNullable().checkPositive()
      table.timestamp('last_heartbeat')

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
