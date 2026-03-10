import { inject } from '@adonisjs/core'
import { randomUUID } from 'node:crypto'
import { type CreateUserDto } from '#users/application/dto/create.user.dto'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { User } from '#users/domain/user.entity'

@inject()
export class CreateUserUseCase {
  constructor(private readonly repository: UserWriteRepository) {}

  execute(dto: CreateUserDto): Promise<User> {
    const user = User.create(randomUUID(), dto.email, dto.firstname, dto.lastname)
    return this.repository.create(user)
  }
}
