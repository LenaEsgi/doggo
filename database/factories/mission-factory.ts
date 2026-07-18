import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import Factory from '@adonisjs/lucid/factories'

export const MissionFactory = Factory.define(MissionModel, ({ faker }) => {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: `Mission ${faker.word.words({ count: { min: 2, max: 4 } })}`,
  }
}).build()
