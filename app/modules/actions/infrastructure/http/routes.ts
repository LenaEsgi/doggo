import router from '@adonisjs/core/services/router'

const CreateActionController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/create-action.controller')

router
  .group(() => {
    router.post('/', [CreateActionController])
  })
  .prefix('/actions')
