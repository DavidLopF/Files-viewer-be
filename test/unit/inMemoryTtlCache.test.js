'use strict'

const { expect } = require('chai')
const InMemoryTtlCache = require('../../src/infrastructure/cache/inMemoryTtlCache')

describe('inMemoryTtlCache', () => {
  it('returns undefined on a miss', () => {
    const cache = new InMemoryTtlCache(1000)

    expect(cache.get('missing')).to.equal(undefined)
  })

  it('returns the stored value on a hit', () => {
    const cache = new InMemoryTtlCache(1000)

    cache.set('key', { some: 'value' })

    expect(cache.get('key')).to.deep.equal({ some: 'value' })
  })

  it('expires entries once the TTL elapses', () => {
    const realNow = Date.now
    let currentTime = 1000
    Date.now = () => currentTime

    try {
      const cache = new InMemoryTtlCache(50)
      cache.set('key', 'value')

      currentTime += 30
      expect(cache.get('key')).to.equal('value')

      currentTime += 30
      expect(cache.get('key')).to.equal(undefined)
    } finally {
      Date.now = realNow
    }
  })

  it('clear() empties the store', () => {
    const cache = new InMemoryTtlCache(1000)
    cache.set('key', 'value')

    cache.clear()

    expect(cache.get('key')).to.equal(undefined)
  })
})
