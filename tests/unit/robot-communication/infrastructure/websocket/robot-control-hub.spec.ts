import { test } from '@japa/runner'
import type { WebSocket } from 'ws'
import { RobotControlHub } from '#app/modules/robot-communication/infrastructure/websocket/robot-control-hub'

function fakeSocket(readyState: number = 1): WebSocket {
  return {
    readyState,
    OPEN: 1,
    send: () => {},
  } as unknown as WebSocket
}

test.group('RobotControlHub', () => {
  test('register retourne true et occupe le robot', ({ assert }) => {
    const hub = new RobotControlHub()
    const socket = fakeSocket()

    assert.isTrue(hub.register('dog-1', socket))
    assert.isTrue(hub.isControlled('dog-1'))
  })

  test('register retourne false si le robot est déjà contrôlé', ({ assert }) => {
    const hub = new RobotControlHub()
    hub.register('dog-1', fakeSocket())

    assert.isFalse(hub.register('dog-1', fakeSocket()))
  })

  test('unregister libère le robot uniquement pour la socket enregistrée', ({ assert }) => {
    const hub = new RobotControlHub()
    const socketA = fakeSocket()
    const socketB = fakeSocket()
    hub.register('dog-1', socketA)

    hub.unregister('dog-1', socketB)
    assert.isTrue(hub.isControlled('dog-1'), 'une socket différente ne doit pas pouvoir libérer')

    hub.unregister('dog-1', socketA)
    assert.isFalse(hub.isControlled('dog-1'))
  })

  test('push envoie le payload JSON à la socket active', ({ assert }) => {
    const hub = new RobotControlHub()
    let sent: string | undefined
    const socket = fakeSocket()
    socket.send = ((data: string) => {
      sent = data
    }) as WebSocket['send']
    hub.register('dog-1', socket)

    hub.push('dog-1', { type: 'position', x: 1, y: 2, heading: 90 })

    assert.equal(sent, JSON.stringify({ type: 'position', x: 1, y: 2, heading: 90 }))
  })

  test('push ne fait rien si aucun robot enregistré', ({ assert }) => {
    const hub = new RobotControlHub()

    assert.doesNotThrow(() => hub.push('dog-unknown', { type: 'position' }))
  })

  test('push ne fait rien si la socket est fermée', ({ assert }) => {
    const hub = new RobotControlHub()
    let called = false
    const socket = fakeSocket(3) // CLOSED
    socket.send = (() => {
      called = true
    }) as WebSocket['send']
    hub.register('dog-1', socket)

    hub.push('dog-1', { type: 'position' })

    assert.isFalse(called)
  })
})
