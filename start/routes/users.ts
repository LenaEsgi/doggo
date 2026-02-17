import router from '@adonisjs/core/services/router'

const UsersController = () => import('#users/infrastructure/controllers/users.controller')

router
  .group(() => {
    router.get('/', [UsersController, 'index'])
    router.get('/:id', [UsersController, 'show'])
    router.patch('/:id', [UsersController, 'update'])
    router.delete('/:id', [UsersController, 'destroy'])
  })
  .prefix('/users')
