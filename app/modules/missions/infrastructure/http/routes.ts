import router from '@adonisjs/core/services/router'
const CreateMissionController = () => import('#app/modules/missions/infrastructure/http/controllers/create-mission.controller')

router.group(() => {
  router.post('/', [CreateMissionController])
}).prefix('/missions')
