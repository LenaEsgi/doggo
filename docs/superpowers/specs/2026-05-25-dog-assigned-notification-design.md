# Design — Notification mail assignation robot dog

**Date :** 2026-05-25

## Contexte

Quand un utilisateur est assigné à un robot dog (via adopt ou assign admin), il doit recevoir un mail de notification. L'envoi ne doit pas bloquer la réponse HTTP.

## Architecture

Pattern : **Event (fire-and-forget) → Listener → Mail**

```
AssignUserToRobotDogUseCase  ─┐
                               ├─ void emitter.emit('ownership:assigned', payload)
AdoptRobotDogUseCase         ─┘
                                         ↓
                               start/events.ts (câblage)
                                         ↓
                               DogAssignedListener.handle()
                                         ↓
                               mail.send(new DogAssignedMail(user, dog))
```

## Fichiers

### Event (contrat entre modules)
- `app/modules/users/ownerships/domain/events/ownership-assigned.event.ts`
  - Type : `{ userId: string, robotDogId: string }`

### Module notifications
- `app/modules/notifications/application/listeners/dog-assigned.listener.ts`
  - Récupère user + robot dog via leurs repositories/gateways
  - Appelle `mail.send()`
- `app/modules/notifications/infrastructure/mail/dog-assigned.mail.ts`
  - Classe mail AdonisJS avec template Edge
- `resources/views/mails/dog-assigned.edge`
  - Template HTML du mail

### Câblage AdonisJS
- `start/events.ts`
  - `emitter.on(OwnershipAssignedEvent, [DogAssignedListener])`

### Use cases modifiés
- `AssignUserToRobotDogUseCase` — `void emitter.emit(...)` après `adopt()`
- `AdoptRobotDogUseCase` — `void emitter.emit(...)` après `adopt()`

## Comportement asynchrone

Le `void` devant `emitter.emit()` rend l'appel fire-and-forget. La réponse HTTP part immédiatement, le listener tourne en arrière-plan. Si l'envoi échoue, l'erreur est loggée mais n'affecte pas le use case.

## Provider mail

**Resend** via `@adonisjs/mail`. Installation : `node ace add @adonisjs/mail`.

## Ce qui n'est pas dans ce scope

- Retry automatique en cas d'échec (nécessiterait une queue type BullMQ)
- Template HTML avancé
- Notification abandon/désassignation
