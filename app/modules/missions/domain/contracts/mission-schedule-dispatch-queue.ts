export type MissionScheduleDispatchPayload = {
  scheduleId: string
  missionId: string
  dogId: string
  firedForMinute: string
}

export abstract class MissionScheduleDispatchQueue {
  abstract enqueue(payload: MissionScheduleDispatchPayload): Promise<void>
}
