export enum RobotCommand {
  START_MISSION = 'start_mission',
  STOP_MISSION = 'stop_mission',
  EMERGENCY_STOP = 'emergency_stop',
  START_SESSION = 'start_session',
  END_SESSION = 'end_session',
}

export interface RobotCommandPayload {
  type: RobotCommand
  missionId?: string
}
