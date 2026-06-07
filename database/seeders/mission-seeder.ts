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
    const seedActions = [
      {
        code: 'MOVE',
        name: 'Move',
        slug: 'move',
        description: 'Move robot dog to target position',
        parameter_schema: {
          fields: [
            {
              name: 'distance_cm',
              label: 'Distance',
              type: 'number',
              required: true,
              unit: 'cm',
              min: 1,
              max: 5000,
              defaultValue: 100,
            },
          ],
        },
      },
      {
        code: 'BARK',
        name: 'Bark',
        slug: 'bark',
        description: 'Make robot dog emit bark sound',
        parameter_schema: {
          fields: [
            {
              name: 'duration_sec',
              label: 'Durée',
              type: 'number',
              required: true,
              unit: 's',
              min: 1,
              max: 30,
              defaultValue: 2,
            },
          ],
        },
      },
      {
        code: 'WAIT',
        name: 'Wait',
        slug: 'wait',
        description: 'Wait for next mission instruction',
        parameter_schema: {
          fields: [
            {
              name: 'duration_sec',
              label: 'Durée',
              type: 'number',
              required: true,
              unit: 's',
              min: 1,
              max: 300,
              defaultValue: 5,
            },
          ],
        },
      },
    ]

    for (const seed of seedActions) {
      const existing = await ActionModel.query().where('code', seed.code).first()
      if (existing) {
        // Mettre à jour le schema si absent
        if (!existing.parameterSchema) {
          await existing.merge({ parameterSchema: seed.parameter_schema as any }).save()
        }
      } else {
        await ActionModel.create({ id: randomUUID(), ...seed })
      }
    }

    return ActionModel.query().whereIn('code', ['MOVE', 'BARK', 'WAIT'])
  }
}
