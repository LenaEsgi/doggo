import { BaseMail } from '@adonisjs/mail'
import type { User } from '#users/domain/user.entity'
import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export default class DogRevokedMail extends BaseMail {
  subject: string

  constructor(
    public readonly user: User,
    public readonly robotDog: RobotDog
  ) {
    super()
    this.subject = `Vous avez été retiré du robot dog ${this.robotDog.name}`
  }

  prepare() {
    this.message
      .from('onboarding@resend.dev')
      .to(this.user.email)
      .htmlView('mails/dog-revoked', {
        user: this.user,
        robotDog: this.robotDog,
      })
  }
}
