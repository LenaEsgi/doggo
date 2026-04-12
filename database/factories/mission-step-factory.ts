import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'
import Factory from '@adonisjs/lucid/factories'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

export const MissionStepFactory = Factory.define(MissionStepModel, ({ faker }) => {
  return {
    id: faker.string.uuid(),
    missionId: faker.string.uuid(),
    actionId: faker.string.uuid(),
    sequenceOrder: faker.number.int({ min: 1, max: 10 }),
    parameters: JSON.stringify({
      speed: faker.number.int({ min: 1, max: 5 }),
      retries: faker.number.int({ min: 0, max: 2 }),
    }),
    status: MissionStepStatus.PENDING,
  }
}).build()
