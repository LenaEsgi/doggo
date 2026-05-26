import emitter from '@adonisjs/core/services/emitter'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'

const DogAssignedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned.listener')

const DogRevokedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-revoked.listener')

const DogAssignedSseListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned-sse.listener')

const DogRevokedSseListener = () =>
  import('#app/modules/notifications/application/listeners/dog-revoked-sse.listener')

emitter.on(OwnershipAssignedEvent, [DogAssignedListener, DogAssignedSseListener])
emitter.on(OwnershipRevokedEvent, [DogRevokedListener, DogRevokedSseListener])
