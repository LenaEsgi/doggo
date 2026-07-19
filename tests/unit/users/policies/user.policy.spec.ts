import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import UserPolicy from '#users/application/policies/user.policy'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'

function makeUser(role: UserRole): User {
  return User.rehydrate('u1', 'fb-u1', 'u1@test.com', 'Test', 'User', role)
}

test.group('UserPolicy.index', () => {
  test('authorizes a non-admin user (search-only enforcement lives in the controller)', ({
    assert,
  }) => {
    const policy = new UserPolicy(new FakeOwnershipRepository())

    const result = policy.index(makeUser(UserRole.USER))

    assert.isTrue(result as boolean)
  })
})
