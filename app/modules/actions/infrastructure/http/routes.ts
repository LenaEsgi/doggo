import router from '@adonisjs/core/services/router'

const CreateActionController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/create-action.controller')

const IndexController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/index-action.controller')

router
  .group(() => {
    router.post('/', [CreateActionController])
    router.get('/', [IndexController])
  })
  .prefix('/actions')
