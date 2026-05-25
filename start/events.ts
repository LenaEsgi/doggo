import emitter from '@adonisjs/core/services/emitter'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'

const DogAssignedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned.listener').then(
    (m) => m.DogAssignedListener
  )

const DogRevokedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-revoked.listener').then(
    (m) => m.DogRevokedListener
  )

emitter.on(OwnershipAssignedEvent, [DogAssignedListener])
emitter.on(OwnershipRevokedEvent, [DogRevokedListener])
