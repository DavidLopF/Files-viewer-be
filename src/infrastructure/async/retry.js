'use strict'

const DEFAULT_ATTEMPTS = 2
const DEFAULT_BASE_DELAY_MS = 300
const RETRYABLE_NETWORK_CODES = new Set(['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT'])

/**
 * The provider fails intermittently with 5xx and connection resets; those
 * are transient. 4xx means the request itself is wrong and retrying it
 * would just repeat the same failure.
 *
 * @param {Error & { code?: string, response?: { status: number } }} error
 * @returns {boolean}
 */
function isRetryableError (error) {
  if (!error) return false
  if (RETRYABLE_NETWORK_CODES.has(error.code)) return true
  const status = error.response && error.response.status
  return typeof status === 'number' && status >= 500
}

function computeDelay (attemptIndex, baseDelayMs) {
  return baseDelayMs * 2 ** attemptIndex + Math.random() * baseDelayMs
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs `fn`, retrying on transient failures with exponential backoff and
 * jitter. Non-retryable errors (e.g. 4xx) are rethrown immediately.
 *
 * @param {() => Promise<*>} fn
 * @param {{ attempts?: number, baseDelayMs?: number, delayFn?: (ms: number) => Promise<void> }} [options]
 * @returns {Promise<*>}
 */
async function withRetry (fn, options = {}) {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const delayFn = options.delayFn || wait

  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isLastAttempt = attempt === attempts
      if (isLastAttempt || !isRetryableError(error)) throw error
      await delayFn(computeDelay(attempt, baseDelayMs))
    }
  }
}

module.exports = { withRetry, isRetryableError }
