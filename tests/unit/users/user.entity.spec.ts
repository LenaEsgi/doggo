import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

test('User.create defaults locale to fr', ({ assert }) => {
  const user = User.create('u1', 'fb-u1', 'u1@test.com', 'Jane', 'Doe')
  assert.equal(user.locale, 'fr')
})

test('User.rehydrate defaults locale to fr when omitted', ({ assert }) => {
  const user = User.rehydrate('u1', 'fb-u1', 'u1@test.com', 'Jane', 'Doe', UserRole.USER)
  assert.equal(user.locale, 'fr')
})

test('User.rehydrate keeps the provided locale', ({ assert }) => {
  const user = User.rehydrate('u1', 'fb-u1', 'u1@test.com', 'Jane', 'Doe', UserRole.USER, 'en')
  assert.equal(user.locale, 'en')
})
