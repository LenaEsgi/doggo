import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const CreateMissionController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/create-mission.controller')
const ShowMissionController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/show-mission.controller')
const IndexMissionController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/index-mission.controller')
const UpdateMissionController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/update-mission.controller')
const DestroyMissionController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/destroy-mission.controller')
const AddStepController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/add-step.controller')
const DestroyMissionStepController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/destroy-mission-step.controller')

const MoveMissionStepController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/move-mission-step.controller')

const SyncMissionStepsController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/sync-mission-steps.controller')

const ListMissionsByDogUseCase = () =>
  import('#app/modules/missions/infrastructure/http/controllers/list-missions-by-dog.controller')

const AssignToDogController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/assign-to-dog.controller')

const RemoveFromDogController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/remove-from-dog.controller')

router
  .group(() => {
    router.post('/', [CreateMissionController])
    router.get('/', [IndexMissionController])
    router.get('/:id', [ShowMissionController])
    router.put('/:id', [UpdateMissionController])
    router.delete('/:id', [DestroyMissionController])

    router.post('/:id/steps', [AddStepController])
    router.put('/:id/steps', [SyncMissionStepsController])
    router.delete('/:missionId/steps/:stepId', [DestroyMissionStepController])
    router.put('/:missionId/steps/:stepId', [MoveMissionStepController])
  })
  .prefix('/api/v1/missions')
  .use(middleware.firebaseAuth())

// Cross-resource routes: dog-mission relationship lives under /api/v1/dogs/:id
// When adding v2, create a second group here with .prefix('/api/v2')
router
  .group(() => {
    router.get('/dogs/:id/missions', [ListMissionsByDogUseCase])
    router.post('/dogs/:id/assign', [AssignToDogController])
    router.delete('/dogs/:id/missions/:missionId', [RemoveFromDogController])
  })
  .prefix('/api/v1')
  .use(middleware.firebaseAuth())
