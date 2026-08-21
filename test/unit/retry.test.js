'use strict'

const { expect } = require('chai')
const { withRetry, isRetryableError } = require('../../src/infrastructure/async/retry')

const noDelay = () => Promise.resolve()

function httpError (status) {
  const error = new Error(`Request failed with status ${status}`)
  error.response = { status }
  return error
}

describe('retry', () => {
  describe('isRetryableError', () => {
    it('treats 5xx responses as retryable', () => {
      expect(isRetryableError(httpError(500))).to.equal(true)
      expect(isRetryableError(httpError(503))).to.equal(true)
    })

    it('treats 4xx responses as non-retryable', () => {
      expect(isRetryableError(httpError(404))).to.equal(false)
      expect(isRetryableError(httpError(400))).to.equal(false)
    })

    it('treats connection resets and timeouts as retryable', () => {
      expect(isRetryableError({ code: 'ECONNRESET' })).to.equal(true)
      expect(isRetryableError({ code: 'ECONNABORTED' })).to.equal(true)
    })
  })

  describe('withRetry', () => {
    it('returns the result on first success without retrying', async () => {
      let calls = 0
      const result = await withRetry(() => {
        calls++
        return Promise.resolve('ok')
      }, { delayFn: noDelay })

      expect(result).to.equal('ok')
      expect(calls).to.equal(1)
    })

    it('retries on a 5xx error and eventually succeeds', async () => {
      let calls = 0
      const result = await withRetry(() => {
        calls++
        if (calls < 3) return Promise.reject(httpError(500))
        return Promise.resolve('recovered')
      }, { attempts: 2, delayFn: noDelay })

      expect(result).to.equal('recovered')
      expect(calls).to.equal(3)
    })

    it('does not retry a 4xx error', async () => {
      let calls = 0
      const fn = () => {
        calls++
        return Promise.reject(httpError(404))
      }

      let thrown
      try {
        await withRetry(fn, { attempts: 2, delayFn: noDelay })
      } catch (error) {
        thrown = error
      }

      expect(thrown).to.be.an('error')
      expect(calls).to.equal(1)
    })

    it('gives up and rethrows after exhausting attempts', async () => {
      let calls = 0
      const fn = () => {
        calls++
        return Promise.reject(httpError(500))
      }

      let thrown
      try {
        await withRetry(fn, { attempts: 2, delayFn: noDelay })
      } catch (error) {
        thrown = error
      }

      expect(thrown).to.be.an('error')
      expect(calls).to.equal(3)
    })
  })
})
