import { test } from '@japa/runner'
import { RabbitMqMissionReportRequestPublisher } from '#app/modules/missions/infrastructure/queue/rabbitmq-mission-report-request-publisher'

test.group('RabbitMqMissionReportRequestPublisher', () => {
  test('publish() envoie sur la queue mission-report.requests via basic_publish', async ({ assert }) => {
    const published: { queue: string; content: Buffer; persistent?: boolean }[] = []
    const fakeChannel = {
      assertQueue: async () => {},
      sendToQueue: (queue: string, content: Buffer, options: { persistent?: boolean }) => {
        published.push({ queue, content, persistent: options.persistent })
        return true
      },
    }

    const publisher = new RabbitMqMissionReportRequestPublisher(async () => fakeChannel as never)

    await publisher.publish({
      missionRunId: 'run-1',
      missionName: 'Patrouille',
      robotDogName: 'Rex',
      status: 'SUCCESS',
      startedAt: '2026-07-25T10:00:00.000Z',
      endedAt: '2026-07-25T10:15:00.000Z',
      steps: [{ name: 'Avancer', status: 'COMPLETED', order: 1 }],
    })

    assert.lengthOf(published, 1)
    assert.equal(published[0].queue, 'mission-report.requests')
    assert.isTrue(published[0].persistent)
    const parsed = JSON.parse(published[0].content.toString('utf8'))
    assert.equal(parsed.missionRunId, 'run-1')
    assert.equal(parsed.steps[0].name, 'Avancer')
  })
})
