import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

/**
 * Creates a fake bouncer that always authorizes.
 */
export function fakeBouncer() {
  return {
    with: () => ({
      authorize: async () => {},
    }),
  }
}

/**
 * Creates a fake authenticated user for testing.
 */
export function fakeAuthenticatedUser(role: UserRole = UserRole.ADMIN) {
  return User.rehydrate('auth-user-id', 'firebase-auth-uid', 'auth@test.com', 'Auth', 'User', role)
}

/**
 * Fake serialize that resolves Item/Collection from @adonisjs/http-transformers.
 * Mimics ctx.serialize() behavior: creates transformer instances, calls toObject(),
 * and wraps results in { data: ... }.
 */
export async function fakeSerialize(resource: any): Promise<{ data: any }> {
  if (resource?.$type === 'collection') {
    const [resources, rest] = resource.transformerData
    const data = resources.map((r: any) => new resource.transformer(r, ...rest).toObject())
    return { data }
  }

  if (resource?.$type === 'item') {
    const [res, rest] = resource.transformerData
    const data = new resource.transformer(res, ...rest).toObject()
    return { data }
  }

  return { data: resource }
}
