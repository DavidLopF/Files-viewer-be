'use strict'

/**
 * Runs `worker` over `items` with at most `limit` in flight at once,
 * settling like Promise.allSettled while keeping results in item order.
 *
 * @param {Array<*>} items
 * @param {number} limit
 * @param {(item: *, index: number) => Promise<*>} worker
 * @returns {Promise<Array<{ status: 'fulfilled', value: * } | { status: 'rejected', reason: * }>>}
 */
function runWithConcurrency (items, limit, worker) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function runNext () {
    const currentIndex = nextIndex++
    if (currentIndex >= items.length) return

    try {
      const value = await worker(items[currentIndex], currentIndex)
      results[currentIndex] = { status: 'fulfilled', value }
    } catch (reason) {
      results[currentIndex] = { status: 'rejected', reason }
    }

    await runNext()
  }

  const workerCount = Math.min(limit, items.length)
  const lanes = []
  for (let i = 0; i < workerCount; i++) lanes.push(runNext())

  return Promise.all(lanes).then(() => results)
}

module.exports = { runWithConcurrency }
