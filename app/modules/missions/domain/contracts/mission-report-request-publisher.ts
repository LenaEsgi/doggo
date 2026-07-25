export type MissionReportRequestStep = {
  name: string
  status: string
  order: number
}

export type MissionReportRequestPayload = {
  missionRunId: string
  missionName: string
  robotDogName: string
  status: 'SUCCESS' | 'FAILED'
  startedAt: string
  endedAt: string | null
  steps: MissionReportRequestStep[]
}

export abstract class MissionReportRequestPublisher {
  abstract publish(payload: MissionReportRequestPayload): Promise<void>
}
