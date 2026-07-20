import { BaseTransformer } from '@adonisjs/core/transformers'
import type { UserWithDogsSummaryDto } from '#users/application/dto/user-with-dogs-summary.dto'
import { UserRole } from '#users/domain/enums/user.role'

export default class UserTransformer extends BaseTransformer<UserWithDogsSummaryDto> {
  private isAdmin: boolean

  constructor(resource: UserWithDogsSummaryDto, isAdmin: boolean) {
    super(resource)
    this.isAdmin = isAdmin
  }

  toObject() {
    if (this.isAdmin) {
      return {
        id: this.resource.user.id,
        email: this.resource.user.email,
        firstname: this.resource.user.firstname,
        lastname: this.resource.user.lastname,
        role: this.resource.user.role === UserRole.ADMIN ? 'admin' : 'user',
        locale: this.resource.user.locale,
        dogs: {
          count: this.resource.dogsCount,
          href: `/dogs/users/${this.resource.user.id}`,
        },
      }
    }

    return {
      id: this.resource.user.id,
      firstname: this.resource.user.firstname,
      lastname: this.resource.user.lastname,
      email: this.resource.user.email,
      role: this.resource.user.role === UserRole.ADMIN ? 'admin' : 'user',
      locale: this.resource.user.locale,
    }
  }
}
