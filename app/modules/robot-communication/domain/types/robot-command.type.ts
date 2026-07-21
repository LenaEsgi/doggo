export enum RobotCommand {
  START_MISSION = 'start_mission',
  STOP_MISSION = 'stop_mission',
  EMERGENCY_STOP = 'emergency_stop',
  START_SESSION = 'start_session',
  END_SESSION = 'end_session',
  DRIVE = 'drive',
}

// Deux axes indépendants façon voiture : on ne tourne (steering) que si on
// avance ou recule (throttle) en même temps — impossible de pivoter sur place.
export type Throttle = 'forward' | 'backward' | 'none'
export type Steering = 'left' | 'right' | 'none'

/**
 * Une étape de mission dénormalisée pour le robot : il reçoit le CODE machine de
 * l'action (et non l'UUID en base) et les paramètres déjà parsés en objet JSON.
 */
export interface RobotCommandStep {
  stepId: string
  order: number
  actionCode: string
  parameters: Record<string, unknown>
}

/**
 * Données optionnelles accompagnant une commande. Pour START_MISSION on transmet le
 * runId (identifiant de l'exécution) et le plan complet dénormalisé.
 */
export interface RobotCommandData {
  runId?: string
  missionId?: string
  steps?: RobotCommandStep[]
  throttle?: Throttle
  steering?: Steering
}

export interface RobotCommandPayload extends RobotCommandData {
  type: RobotCommand
}
