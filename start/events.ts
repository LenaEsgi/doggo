import emitter from '@adonisjs/core/services/emitter'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
const DogAssignedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned.listener')

emitter.on(OwnershipAssignedEvent, [DogAssignedListener])
