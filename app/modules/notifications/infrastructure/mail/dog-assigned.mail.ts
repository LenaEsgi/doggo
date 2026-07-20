import { BaseMail } from '@adonisjs/mail'
import i18nManager from '@adonisjs/i18n/services/main'
import type { User } from '#users/domain/user.entity'
import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export default class DogAssignedMail extends BaseMail {
  subject: string

  constructor(
    public readonly user: User,
    public readonly robotDog: RobotDog,
    public readonly robotDogUrl: string
  ) {
    super()
    const i18n = i18nManager.locale(this.user.locale)
    this.subject = i18n.t('emails.dog_assigned.subject', { dogName: this.robotDog.name })
  }

  prepare() {
    const i18n = i18nManager.locale(this.user.locale)

    this.message.from('onboarding@resend.dev').to(this.user.email).htmlView('mails/dog-assigned', {
      user: this.user,
      robotDog: this.robotDog,
      robotDogUrl: this.robotDogUrl,
      locale: this.user.locale,
      t: {
        brand: i18n.t('emails.common.brand'),
        greeting: i18n.t('emails.common.greeting', { name: `${this.user.firstname} ${this.user.lastname}` }),
        copyright: i18n.t('emails.common.copyright'),
        title: i18n.t('emails.dog_assigned.title'),
        intro: i18n.t('emails.dog_assigned.intro'),
        label: i18n.t('emails.dog_assigned.label'),
        cta: i18n.t('emails.dog_assigned.cta'),
        footer: i18n.t('emails.dog_assigned.footer'),
      },
    })
  }
}
