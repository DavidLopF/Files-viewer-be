'use strict'

const { expect } = require('chai')
const { runWithConcurrency } = require('../../src/infrastructure/async/concurrencyPool')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe('concurrencyPool', () => {
  it('never runs more than `limit` workers at once', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const items = [1, 2, 3, 4, 5, 6, 7, 8]

    await runWithConcurrency(items, 3, async (item) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await wait(5)
      inFlight--
      return item * 2
    })

    expect(maxInFlight).to.be.at.most(3)
  })

  it('preserves result order regardless of completion order', async () => {
    const items = [30, 10, 20]

    const results = await runWithConcurrency(items, 3, async (item) => {
      await wait(item)
      return item
    })

    expect(results.map((r) => r.value)).to.deep.equal([30, 10, 20])
  })

  it('settles each item independently, like Promise.allSettled', async () => {
    const items = ['ok', 'fail', 'ok']

    const results = await runWithConcurrency(items, 2, async (item) => {
      if (item === 'fail') throw new Error('boom')
      return item
    })

    expect(results[0]).to.deep.equal({ status: 'fulfilled', value: 'ok' })
    expect(results[1].status).to.equal('rejected')
    expect(results[1].reason.message).to.equal('boom')
    expect(results[2]).to.deep.equal({ status: 'fulfilled', value: 'ok' })
  })

  it('handles an empty item list', async () => {
    const results = await runWithConcurrency([], 5, async (item) => item)

    expect(results).to.deep.equal([])
  })
})
