import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { randomUUID } from 'node:crypto'
import { MissionFactory } from '#database/factories/mission-factory'
import { MissionStepFactory } from '#database/factories/mission-step-factory'
import { RobotDogFactory } from '#database/factories/robot-dog-factory'
import { UserFactory } from '#database/factories/user-factory'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'

export default class extends BaseSeeder {
  async run() {
    const users = await this.ensureUsers()
    const robotDogs = await this.ensureRobotDogs()
    const actions = await this.ensureActions()

    const missions = await Promise.all(
      Array.from({ length: 12 }).map(async (_, index) => {
        const user = users[index % users.length]

        return MissionFactory.merge({
          userId: user.id,
        }).create()
      })
    )

    for (const [index, mission] of missions.entries()) {
      const dog = robotDogs[index % robotDogs.length]
      await mission.related('robotDogs').attach([dog.id])

      const stepsCount = (index % 3) + 1
      for (let sequenceOrder = 1; sequenceOrder <= stepsCount; sequenceOrder++) {
        const action = actions[(index + sequenceOrder - 1) % actions.length]
        await MissionStepFactory.merge({
          missionId: mission.id,
          actionId: action.id,
          sequenceOrder,
        }).create()
      }
    }
  }

  private async ensureUsers(): Promise<UserModel[]> {
    const users = await UserModel.query().limit(5)
    if (users.length > 0) {
      return users
    }

    return UserFactory.createMany(5)
  }

  private async ensureRobotDogs(): Promise<RobotDogModel[]> {
    const robotDogs = await RobotDogModel.query().limit(5)
    if (robotDogs.length > 0) {
      return robotDogs
    }

    return RobotDogFactory.createMany(5)
  }

  private async ensureActions(): Promise<ActionModel[]> {
    const actions = await ActionModel.query().limit(5)
    if (actions.length > 0) {
      return actions
    }

    const seedActions = [
      {
        id: randomUUID(),
        code: 'MOVE',
        name: 'Move',
        slug: 'move',
        description: 'Move robot dog to target position',
      },
      {
        id: randomUUID(),
        code: 'BARK',
        name: 'Bark',
        slug: 'bark',
        description: 'Make robot dog emit bark sound',
      },
      {
        id: randomUUID(),
        code: 'WAIT',
        name: 'Wait',
        slug: 'wait',
        description: 'Wait for next mission instruction',
      },
    ]

    await ActionModel.createMany(seedActions)
    return ActionModel.query().limit(5)
  }
}
