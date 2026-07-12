import { test } from '@japa/runner'
import { toPaginatedResult } from '#app/modules/share/infrastructure/database/to-paginated-result'

test.group('toPaginatedResult', () => {
  test('maps rows and builds meta', ({ assert }) => {
    const fakePaginator = {
      all: () => [{ n: 1 }, { n: 2 }],
      total: 2,
      perPage: 20,
      currentPage: 1,
      firstPage: 1,
      lastPage: 1,
    }

    const result = toPaginatedResult(fakePaginator, (row) => row.n * 10)

    assert.deepEqual(result.data, [10, 20])
    assert.deepEqual(result.meta, {
      total: 2,
      perPage: 20,
      currentPage: 1,
      firstPage: 1,
      lastPage: 1,
    })
  })
})
