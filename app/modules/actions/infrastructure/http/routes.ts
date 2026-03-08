import router from '@adonisjs/core/services/router'

const CreateActionController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/create-action.controller')

const IndexController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/index-action.controller')

const ShowController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/show-action.controller')

const DestroyController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/destroy-action.controller')

router
  .group(() => {
    router.post('/', [CreateActionController])
    router.get('/', [IndexController])
    router.get('/:id', [ShowController])
    router.delete('/:id', [DestroyController])
  })
  .prefix('/actions')
