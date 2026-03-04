import router from '@adonisjs/core/services/router'
const CreateMissionController = () => import('#app/modules/missions/infrastructure/http/controllers/create-mission.controller')
const ShowMissionController = () => import('#app/modules/missions/infrastructure/http/controllers/show-mission.controller')
const IndexMissionController = () => import('#app/modules/missions/infrastructure/http/controllers/index-mission.controller')

router.group(() => {
  router.post('/', [CreateMissionController])
  router.get('/', [IndexMissionController])
  router.get('/:id', [ShowMissionController])
}).prefix('/missions')
