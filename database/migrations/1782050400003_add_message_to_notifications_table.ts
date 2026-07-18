import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('message').notNullable().defaultTo('').after('type')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('message')
    })
  }
}
