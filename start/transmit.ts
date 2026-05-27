import transmit from '@adonisjs/transmit/services/main'
import app from '@adonisjs/core/services/app'
import { OwnershipReadRepository } from '#users/ownerships/domain/contracts/ownership.read.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'

transmit.authorize<{ id: string }>('users/:id', (ctx, { id }) => {
  return ctx.authenticatedUser?.id === id
})

transmit.authorize<{ id: string }>('dogs/:id', async (ctx, { id }) => {
  const ownershipRepo = await app.container.make(OwnershipReadRepository)
  return ownershipRepo.isOwner(ctx.authenticatedUser.id, id)
})

transmit.authorize<{ id: string }>('missions/:id', async (ctx, { id }) => {
  const missionRepo = await app.container.make(MissionRepository)
  const mission = await missionRepo.findById(MissionId.fromString(id))
  if (!mission) return false
  return mission.userId === ctx.authenticatedUser.id
})
