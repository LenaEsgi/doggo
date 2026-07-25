import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        'CREATE SEQUENCE IF NOT EXISTS robot_dogs_serial_seq START WITH 1 INCREMENT BY 1'
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery('DROP SEQUENCE IF EXISTS robot_dogs_serial_seq')
    })
  }
}
