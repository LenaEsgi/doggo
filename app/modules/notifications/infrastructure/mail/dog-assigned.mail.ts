import { BaseMail } from '@adonisjs/mail'
import type { User } from '#users/domain/user.entity'
import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export default class DogAssignedMail extends BaseMail {
  subject: string

  constructor(
    private readonly user: User,
    private readonly robotDog: RobotDog
  ) {
    super()
    this.subject = `Vous avez été assigné au robot dog ${this.robotDog.name}`
  }

  prepare() {
    this.message
      .to(this.user.email)
      .htmlView('mails/dog-assigned', {
        user: this.user,
        robotDog: this.robotDog,
      })
  }
}
