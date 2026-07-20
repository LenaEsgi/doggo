import i18nManager from '@adonisjs/i18n/services/main'
import type { UserLocale } from '#users/domain/user.entity'
import type { NotificationType } from '#app/modules/notifications/application/notification.service'

const MESSAGE_KEYS: Record<NotificationType, string> = {
  'dog.assigned': 'notifications.dog.assigned',
  'dog.revoked': 'notifications.dog.revoked',
  'dog.member.assigned': 'notifications.dog.member_assigned',
  'dog.member.revoked': 'notifications.dog.member_revoked',
  'mission.started': 'notifications.mission.started',
  'mission.completed': 'notifications.mission.completed',
  'mission.failed': 'notifications.mission.failed',
  'mission.skipped': 'notifications.mission.skipped',
  'mission.interrupted': 'notifications.mission.interrupted',
}

export class NotificationMessageTranslator {
  translate(
    type: NotificationType,
    payload: Record<string, unknown> | null | undefined,
    locale: UserLocale
  ): string {
    const i18n = i18nManager.locale(locale)

    const dog = (payload?.robotDogName as string | undefined) ?? i18n.t('notifications.defaults.dog')
    const member =
      (payload?.memberName as string | undefined) ?? i18n.t('notifications.defaults.member')
    const mission =
      (payload?.missionName as string | undefined) ?? i18n.t('notifications.defaults.mission')

    if (type === 'mission.interrupted') {
      const reason = payload?.reason as string | undefined
      const reasonText =
        reason === 'ROBOT_OFFLINE'
          ? i18n.t('notifications.reasons.robot_offline')
          : i18n.t('notifications.reasons.max_duration')

      return i18n.t(MESSAGE_KEYS[type], { mission, dog, reasonText })
    }

    return i18n.t(MESSAGE_KEYS[type], { dog, member, mission })
  }
}
