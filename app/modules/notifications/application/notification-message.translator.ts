import i18nManager from '@adonisjs/i18n/services/main'
import type { UserLocale } from '#users/domain/user.entity'
import type { NotificationType } from '#app/modules/notifications/application/notification.service'

const MESSAGE_KEYS: Record<NotificationType, string> = {
  'dog.assigned': 'notifications.dog.assigned',
  'dog.revoked': 'notifications.dog.revoked',
  'dog.member.assigned': 'notifications.dog.member_assigned',
  'dog.member.revoked': 'notifications.dog.member_revoked',
  'dog.offline': 'notifications.dog.offline',
  'dog.error': 'notifications.dog.error',
  'dog.battery_low': 'notifications.dog.battery_low',
  'mission.started': 'notifications.mission.started',
  'mission.completed': 'notifications.mission.completed',
  'mission.failed': 'notifications.mission.failed',
  'mission.start_failed': 'notifications.mission.start_failed',
  'mission.skipped': 'notifications.mission.skipped',
  'mission.interrupted': 'notifications.mission.interrupted',
  'mission.assigned_to_dog': 'notifications.mission.assigned_to_dog',
  'mission.removed_from_dog': 'notifications.mission.removed_from_dog',
}

const START_FAILURE_REASON_KEYS: Record<string, string> = {
  ROBOT_OFFLINE: 'notifications.reasons.robot_offline',
  ROBOT_ERROR: 'notifications.reasons.robot_error',
  ROBOT_BUSY: 'notifications.reasons.robot_busy',
  BATTERY_TOO_LOW: 'notifications.reasons.battery_too_low',
  TIMEOUT: 'notifications.reasons.timeout',
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

    if (type === 'mission.start_failed') {
      const reason = payload?.reason as string | undefined
      const reasonKey = (reason && START_FAILURE_REASON_KEYS[reason]) || 'notifications.reasons.robot_busy'
      const reasonText = i18n.t(reasonKey)

      return i18n.t(MESSAGE_KEYS[type], { mission, dog, reasonText })
    }

    if (type === 'dog.battery_low') {
      const level = payload?.batteryLevel as number | undefined
      return i18n.t(MESSAGE_KEYS[type], { dog, level: level ?? 0 })
    }

    return i18n.t(MESSAGE_KEYS[type], { dog, member, mission })
  }
}
