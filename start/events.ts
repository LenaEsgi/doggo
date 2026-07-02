import emitter from '@adonisjs/core/services/emitter'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'
import RobotTelemetryReceivedEvent from '#dogs/domain/events/robot-telemetry-received.event'
import MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'

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

emitter.listen(OwnershipAssignedEvent, [DogAssignedListener, DogAssignedSseListener])
emitter.listen(OwnershipRevokedEvent, [DogRevokedListener, DogRevokedSseListener])
emitter.listen(RobotTelemetryReceivedEvent, [RobotTelemetrySseListener])
emitter.listen(MissionStepUpdatedEvent, [MissionStepUpdatedSseListener])
emitter.listen(MissionCompletedEvent, [MissionCompletedSseListener])
