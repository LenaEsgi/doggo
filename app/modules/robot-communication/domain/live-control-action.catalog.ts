import Action from '#app/modules/actions/domain/action.entity'
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

/**
 * Vocabulaire fixe du pilotage live (touches z/q/s/d, BARK, JUMP...). Contrairement
 * aux actions de mission (catalogue admin en base, résolu une fois à la création du
 * plan), ces commandes partent à chaque frappe de touche : elles doivent rester
 * validables sans aucun aller-retour DB ni cache, quoi qu'il arrive côté base.
 */
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

const LIVE_CONTROL_ACTIONS: readonly Action[] = [
  Action.create('MOVE_FORWARD', 'Avancer', 'move-forward', 'Fait avancer le robot', speedParameterSchema),
  Action.create('MOVE_BACKWARD', 'Reculer', 'move-backward', 'Fait reculer le robot', speedParameterSchema),
  Action.create(
    'MOVE_LEFT',
    'Tourner à gauche',
    'move-left',
    'Fait tourner le robot vers la gauche',
    speedParameterSchema
  ),
  Action.create(
    'MOVE_RIGHT',
    'Tourner à droite',
    'move-right',
    'Fait tourner le robot vers la droite',
    speedParameterSchema
  ),
  Action.create('STOP', 'Arrêter', 'stop', 'Arrête tout mouvement du robot', null),
  Action.create('BARK', 'Aboyer', 'bark', 'Fait aboyer le robot', null),
  Action.create('JUMP', 'Sauter', 'jump', 'Fait sauter le robot', null),
]

const BY_CODE = new Map(LIVE_CONTROL_ACTIONS.map((action) => [action.code, action]))

export function findLiveControlAction(code: string): Action | null {
  return BY_CODE.get(code.toUpperCase()) ?? null
}
