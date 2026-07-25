import emitter from '@adonisjs/core/services/emitter'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'
import RobotTelemetryReceivedEvent from '#dogs/domain/events/robot-telemetry-received.event'
import MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import MissionScheduleSkippedEvent from '#app/modules/missions/domain/events/mission-schedule-skipped.event'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'
import MissionAutoInterruptedEvent from '#app/modules/missions/domain/events/mission-auto-interrupted.event'
import MissionStartedEvent from '#app/modules/missions/domain/events/mission-started.event'
import MissionStartFailedEvent from '#app/modules/missions/domain/events/mission-start-failed.event'
import MissionAssignedToDogEvent from '#app/modules/missions/domain/events/mission-assigned-to-dog.event'
import MissionRemovedFromDogEvent from '#app/modules/missions/domain/events/mission-removed-from-dog.event'
import RobotBatteryLowEvent from '#dogs/domain/events/robot-battery-low.event'

const DogAssignedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned.listener')

const DogRevokedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-revoked.listener')

const DogAssignedSseListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned-sse.listener')

const DogRevokedSseListener = () =>
  import('#app/modules/notifications/application/listeners/dog-revoked-sse.listener')

const RobotTelemetrySseListener = () =>
  import('#app/modules/notifications/application/listeners/robot-telemetry-sse.listener')

const MissionStepUpdatedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-step-updated-sse.listener')

const MissionCompletedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-completed-sse.listener')

const MissionReportRequestListener = () =>
  import('#app/modules/missions/application/listeners/mission-report-request.listener')

const MissionScheduleSkippedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-schedule-skipped-sse.listener')

const DogStateChangedSseListener = () =>
  import('#app/modules/notifications/application/listeners/dog-state-changed-sse.listener')

const MissionAutoInterruptedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-auto-interrupted-sse.listener')

const MissionStartedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-started-sse.listener')

const MissionStartFailedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-start-failed-sse.listener')

const MissionAssignedToDogSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-assigned-to-dog-sse.listener')

const MissionRemovedFromDogSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-removed-from-dog-sse.listener')

const RobotBatteryLowSseListener = () =>
  import('#app/modules/notifications/application/listeners/robot-battery-low-sse.listener')

const RobotStateAlertSseListener = () =>
  import('#app/modules/notifications/application/listeners/robot-state-alert-sse.listener')

emitter.listen(OwnershipAssignedEvent, [DogAssignedListener, DogAssignedSseListener])
emitter.listen(OwnershipRevokedEvent, [DogRevokedListener, DogRevokedSseListener])
emitter.listen(RobotTelemetryReceivedEvent, [RobotTelemetrySseListener])
emitter.listen(MissionStepUpdatedEvent, [MissionStepUpdatedSseListener])
emitter.listen(MissionCompletedEvent, [MissionCompletedSseListener, MissionReportRequestListener])
emitter.listen(MissionScheduleSkippedEvent, [MissionScheduleSkippedSseListener])
emitter.listen(DogStateChangedEvent, [DogStateChangedSseListener, RobotStateAlertSseListener])
emitter.listen(MissionAutoInterruptedEvent, [MissionAutoInterruptedSseListener])
emitter.listen(MissionStartedEvent, [MissionStartedSseListener])
emitter.listen(MissionStartFailedEvent, [MissionStartFailedSseListener])
emitter.listen(MissionAssignedToDogEvent, [MissionAssignedToDogSseListener])
emitter.listen(MissionRemovedFromDogEvent, [MissionRemovedFromDogSseListener])
emitter.listen(RobotBatteryLowEvent, [RobotBatteryLowSseListener])
