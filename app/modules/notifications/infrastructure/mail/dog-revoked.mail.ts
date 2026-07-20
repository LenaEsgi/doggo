import { BaseMail } from '@adonisjs/mail'
import i18nManager from '@adonisjs/i18n/services/main'
import type { User } from '#users/domain/user.entity'
import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export default class DogRevokedMail extends BaseMail {
  subject: string

  constructor(
    public readonly user: User,
    public readonly robotDog: RobotDog
  ) {
    super()
    const i18n = i18nManager.locale(this.user.locale)
    this.subject = i18n.t('emails.dog_revoked.subject', { dogName: this.robotDog.name })
  }

  prepare() {
    const i18n = i18nManager.locale(this.user.locale)

    this.message.from('onboarding@resend.dev').to(this.user.email).htmlView('mails/dog-revoked', {
      user: this.user,
      robotDog: this.robotDog,
      locale: this.user.locale,
      t: {
        brand: i18n.t('emails.common.brand'),
        greeting: i18n.t('emails.common.greeting', { name: `${this.user.firstname} ${this.user.lastname}` }),
        copyright: i18n.t('emails.common.copyright'),
        title: i18n.t('emails.dog_revoked.title'),
        intro: i18n.t('emails.dog_revoked.intro'),
        label: i18n.t('emails.dog_revoked.label'),
        footer: i18n.t('emails.dog_revoked.footer'),
      },
    })
  }
}
