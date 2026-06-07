export interface SyncStepItem {
  id?: string
  actionId: string
  parameters: string
}

export interface SyncMissionStepsDto {
  missionId: string
  steps: SyncStepItem[]
}
