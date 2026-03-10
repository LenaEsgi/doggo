import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import CreateUserController from '#users/infrastructure/http/controllers/create.user.controller'

class FakeCreateUserUseCase {
  async execute() {
    return User.rehydrate('u1', 'john@example.com', 'John', 'Doe', UserRole.USER)
  }
}

function createContext(validatedPayload: any) {
  const result: { status?: number; body?: any } = {}

  return {
    result,
    ctx: {
      request: {
        validateUsing: async () => validatedPayload,
      },
      response: {
        created: (body: any) => {
          result.status = 201
          result.body = body
          return body
        },
      },
    },
  }
}

test('CreateUserController creates a user', async ({ assert }) => {
  const controller = new CreateUserController(new FakeCreateUserUseCase() as any)
  const { ctx, result } = createContext({
    firstname: 'John',
    lastname: 'Doe',
    email: 'john@example.com',
  })

  await controller.handle(ctx as any)

  assert.equal(result.status, 201)
  assert.equal(result.body.message, 'Created user')
  assert.equal(result.body.user.email, 'john@example.com')
})
