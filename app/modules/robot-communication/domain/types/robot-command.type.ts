export enum RobotCommand {
  START_MISSION = 'start_mission',
  STOP_MISSION = 'stop_mission',
  EMERGENCY_STOP = 'emergency_stop',
  START_SESSION = 'start_session',
  END_SESSION = 'end_session',
}

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
}

export interface RobotCommandPayload extends RobotCommandData {
  type: RobotCommand
}
