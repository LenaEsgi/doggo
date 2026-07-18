import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { randomUUID } from 'node:crypto'
import { MissionFactory } from '#database/factories/mission-factory'
import { MissionStepFactory } from '#database/factories/mission-step-factory'
import { RobotDogFactory } from '#database/factories/robot-dog-factory'
import { UserFactory } from '#database/factories/user-factory'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'

export default class extends BaseSeeder {
  async run() {
    // ensureActions() reste un upsert (schema potentiellement mis à jour à chaque run),
    // mais les 12 missions de démo ne doivent être créées qu'une seule fois.
    const actions = await this.ensureActions()

    const existingMission = await MissionModel.query().first()
    if (existingMission) {
      return
    }

    const users = await this.ensureUsers()
    const robotDogs = await this.ensureRobotDogs()

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
          parameters: defaultParametersFor(action.code),
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
    // Supprime l'ancienne action MOVE (remplacée par MOVE_DISTANCE + MOVE_DURATION).
    // Les steps qui la référençaient sont cascade-deleted via la FK.
    await ActionModel.query().where('code', 'MOVE').delete()

    const seedActions = [
      {
        code: 'MOVE_DISTANCE',
        name: 'Avancer (distance)',
        slug: 'move-distance',
        description: 'Déplacer le robot sur une distance donnée à une vitesse donnée',
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
            {
              name: 'speed_pct',
              label: 'Vitesse',
              type: 'number',
              required: true,
              unit: '%',
              min: 1,
              max: 100,
              defaultValue: 50,
            },
          ],
        },
      },
      {
        code: 'MOVE_DURATION',
        name: 'Avancer (durée)',
        slug: 'move-duration',
        description: 'Déplacer le robot pendant une durée donnée à une vitesse donnée',
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
            {
              name: 'speed_pct',
              label: 'Vitesse',
              type: 'number',
              required: true,
              unit: '%',
              min: 1,
              max: 100,
              defaultValue: 50,
            },
          ],
        },
      },
      {
        code: 'BARK',
        name: 'Aboyer',
        slug: 'bark',
        description: 'Faire aboyer le robot',
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
        name: 'Attendre',
        slug: 'wait',
        description: 'Mettre le robot en pause',
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
        // Toujours mettre à jour le schema (peut avoir changé)
        await existing.merge({ parameterSchema: seed.parameter_schema as any }).save()
      } else {
        await ActionModel.create({ id: randomUUID(), ...seed })
      }
    }

    return ActionModel.query().whereIn('code', ['MOVE_DISTANCE', 'MOVE_DURATION', 'BARK', 'WAIT'])
  }
}

/** Retourne des paramètres valides (conformes au schema) pour une action donnée. */
function defaultParametersFor(code: string): string {
  switch (code) {
    case 'MOVE_DISTANCE':
      return JSON.stringify({ distance_cm: 100, speed_pct: 50 })
    case 'MOVE_DURATION':
      return JSON.stringify({ duration_sec: 5, speed_pct: 50 })
    case 'BARK':
      return JSON.stringify({ duration_sec: 2 })
    case 'WAIT':
      return JSON.stringify({ duration_sec: 5 })
    default:
      return '{}'
  }
}
