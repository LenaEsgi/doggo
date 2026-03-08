import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('code', 50).unique().notNullable()
      table.string('name', 50).notNullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('code')
      table.dropColumn('name')
    })
  }
}
