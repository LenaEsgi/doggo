import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MqttAccountProvisioningFailedError extends DomainError {
  readonly httpStatus = 502
  readonly code = 'MQTT_ACCOUNT_PROVISIONING_FAILED'

  constructor(robotDogId: string, cause: unknown) {
    super(`Failed to provision MQTT account for robot dog ${robotDogId}.`, {
      cause: cause instanceof Error ? cause.message : String(cause),
    })
  }
}
