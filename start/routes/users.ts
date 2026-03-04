import router from '@adonisjs/core/services/router'

const IndexUserController = () =>
  import('#app/modules/users/infrastructure/http/controllers/index.user.controller')
const ShowUserController = () =>
  import('#app/modules/users/infrastructure/http/controllers/show.user.controller')
const UpdateUserController = () =>
  import('#app/modules/users/infrastructure/http/controllers/update.user.controller')
const DeleteUserController = () =>
  import('#app/modules/users/infrastructure/http/controllers/delete.user.controller')

router
  .group(() => {
    router.get('/', [IndexUserController, 'handle'])
    router.get('/:id', [ShowUserController, 'handle'])
    router.patch('/:id', [UpdateUserController, 'handle'])
    router.delete('/:id', [DeleteUserController, 'handle'])
  })
  .prefix('/users')
