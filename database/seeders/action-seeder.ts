import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Action from '#app/modules/actions/domain/action.entity'
import { ActionRepositoryImplementation } from '#app/modules/actions/infrastructure/database/repositories/action.repository.implementation'
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

const speedParameterSchema: ActionParameterSchema = {
  fields: [
    {
      name: 'speed',
      label: 'Vitesse',
      type: 'number',
      required: false,
      unit: '%',
      min: 0,
      max: 100,
      defaultValue: 50,
    },
  ],
}

const LIVE_CONTROL_ACTIONS: {
  code: string
  name: string
  slug: string
  description: string
  parameterSchema: ActionParameterSchema | null
}[] = [
  {
    code: 'MOVE_FORWARD',
    name: 'Avancer',
    slug: 'move-forward',
    description: 'Fait avancer le robot',
    parameterSchema: speedParameterSchema,
  },
  {
    code: 'MOVE_BACKWARD',
    name: 'Reculer',
    slug: 'move-backward',
    description: 'Fait reculer le robot',
    parameterSchema: speedParameterSchema,
  },
  {
    code: 'MOVE_LEFT',
    name: 'Tourner à gauche',
    slug: 'move-left',
    description: 'Fait tourner le robot vers la gauche',
    parameterSchema: speedParameterSchema,
  },
  {
    code: 'MOVE_RIGHT',
    name: 'Tourner à droite',
    slug: 'move-right',
    description: 'Fait tourner le robot vers la droite',
    parameterSchema: speedParameterSchema,
  },
  {
    code: 'STOP',
    name: 'Arrêter',
    slug: 'stop',
    description: 'Arrête tout mouvement du robot',
    parameterSchema: null,
  },
  {
    code: 'BARK',
    name: 'Aboyer',
    slug: 'bark',
    description: 'Fait aboyer le robot',
    parameterSchema: null,
  },
  {
    code: 'JUMP',
    name: 'Sauter',
    slug: 'jump',
    description: 'Fait sauter le robot',
    parameterSchema: null,
  },
]

export default class extends BaseSeeder {
  async run() {
    const actionRepository = new ActionRepositoryImplementation()

    for (const definition of LIVE_CONTROL_ACTIONS) {
      const existing = await actionRepository.findByCode(definition.code)
      if (existing) {
        continue
      }

      const action = Action.create(
        definition.code,
        definition.name,
        definition.slug,
        definition.description,
        definition.parameterSchema
      )

      await actionRepository.save(action)
    }
  }
}
