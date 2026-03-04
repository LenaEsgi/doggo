import { test } from '@japa/runner'
import { UpdateUserService } from '#users/application/contracts/update.user.service'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import UpdateUserController from '#users/infrastructure/http/controllers/update.user.controller'

class FakeUpdateUserService extends UpdateUserService {
  constructor(private readonly result: User | null) {
    super()
  }

  async update() {
    return this.result
  }
}

test('UpdateUserController returns 200 when updated', async ({ assert }) => {
  const controller = new UpdateUserController(
    new FakeUpdateUserService(
      User.rehydrate('u1', 'jane@example.com', 'Jane', 'Doe', UserRole.ADMIN)
    )
  )

  const result: { status?: number; body?: any } = {}
  let call = 0

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => {
        call += 1
        return call === 1
          ? { id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }
          : { firstname: 'Jane', role: 'admin' }
      },
    },
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
      notFound: (body: any) => {
        result.status = 404
        result.body = body
      },
    },
  } as any)

  assert.equal(result.status, 200)
  assert.equal(result.body.message, 'User updated successfully')
  assert.equal(result.body.user.role, 'admin')
})

test('UpdateUserController returns 404 when missing', async ({ assert }) => {
  const controller = new UpdateUserController(new FakeUpdateUserService(null))

  const result: { status?: number; body?: any } = {}
  let call = 0

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => {
        call += 1
        return call === 1 ? { id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' } : { firstname: 'Jane' }
      },
    },
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
      notFound: (body: any) => {
        result.status = 404
        result.body = body
      },
    },
  } as any)

  assert.equal(result.status, 404)
  assert.equal(result.body.error, 'USER_NOT_FOUND')
})
