import { test } from '@japa/runner'
import type { HttpContext } from '@adonisjs/core/http'
import HttpExceptionHandler from '#exceptions/handler'
import { HttpError } from '#app/modules/share/exceptions/http-error'
import { DomainError } from '#app/modules/share/exceptions/domain-error'

class FakeHttpError extends HttpError {
  constructor() {
    super('bad request', 400, 'FAKE_HTTP_ERROR', { field: 'x' })
  }
}

class FakeDomainError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'FAKE_DOMAIN_ERROR'

  constructor() {
    super('domain conflict')
  }
}

function fakeCtx() {
  const calls: { status?: number; body?: unknown } = {}
  const response = {
    status(code: number) {
      calls.status = code
      return this
    },
    json(body: unknown) {
      calls.body = body
      return this
    },
    send(body: unknown) {
      calls.body = body
      return this
    },
  }
  const request = {
    accepts: () => 'json',
    request: { url: '/test' },
  }
  return { ctx: { response, request } as unknown as HttpContext, calls }
}

test.group('HttpExceptionHandler', () => {
  test('renders HttpError with its own status/code/message/details', async ({ assert }) => {
    const handler = new HttpExceptionHandler()
    const { ctx, calls } = fakeCtx()

    await handler.handle(new FakeHttpError(), ctx)

    assert.equal(calls.status, 400)
    assert.deepEqual(calls.body, {
      error: 'FAKE_HTTP_ERROR',
      message: 'bad request',
      details: { field: 'x' },
    })
  })

  test('renders DomainError with its own httpStatus/code/message', async ({ assert }) => {
    const handler = new HttpExceptionHandler()
    const { ctx, calls } = fakeCtx()

    await handler.handle(new FakeDomainError(), ctx)

    assert.equal(calls.status, 409)
    assert.deepEqual(calls.body, {
      error: 'FAKE_DOMAIN_ERROR',
      message: 'domain conflict',
      details: undefined,
    })
  })

  test('sanitizes an unclassified error and never leaks its message when debug is disabled', async ({
    assert,
  }) => {
    const handler = new HttpExceptionHandler()
    ;(handler as unknown as { debug: boolean }).debug = false
    const { ctx, calls } = fakeCtx()

    const dbError = new Error(
      'insert or update on table "mission_runs" violates foreign key constraint "mission_runs_robot_dog_id_foreign"'
    )

    await handler.handle(dbError, ctx)

    assert.equal(calls.status, 500)
    assert.notInclude(JSON.stringify(calls.body), 'mission_runs')
    assert.notInclude(JSON.stringify(calls.body), 'foreign key')
    assert.deepEqual(calls.body, {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    })
  })

  test('preserves a numeric status on an unclassified error when sanitizing', async ({
    assert,
  }) => {
    const handler = new HttpExceptionHandler()
    ;(handler as unknown as { debug: boolean }).debug = false
    const { ctx, calls } = fakeCtx()

    const err = new Error('service unavailable') as Error & { status: number }
    err.status = 503

    await handler.handle(err, ctx)

    assert.equal(calls.status, 503)
    assert.notInclude(JSON.stringify(calls.body), 'service unavailable')
  })

  test('still lets self-handling errors (validation, framework) handle themselves even when debug is disabled', async ({
    assert,
  }) => {
    const handler = new HttpExceptionHandler()
    ;(handler as unknown as { debug: boolean }).debug = false
    const { ctx } = fakeCtx()

    let handledWith: unknown
    const selfHandlingError = {
      message: 'field is required',
      status: 422,
      handle(error: unknown, receivedCtx: HttpContext) {
        handledWith = { error, receivedCtx }
      },
    }

    await handler.handle(selfHandlingError, ctx)

    assert.isDefined(handledWith)
  })

  test('still lets Vine validation errors (E_VALIDATION_ERROR) handle themselves even when debug is disabled', async ({
    assert,
  }) => {
    const handler = new HttpExceptionHandler()
    ;(handler as unknown as { debug: boolean }).debug = false
    const { ctx, calls } = fakeCtx()

    const validationError = {
      message: 'Validation failure',
      status: 422,
      code: 'E_VALIDATION_ERROR',
      messages: [{ field: 'email', message: 'must be a valid email' }],
    }

    await handler.handle(validationError, ctx)

    assert.equal(calls.status, 422)
    assert.notEqual(calls.body, undefined)
  })
})
