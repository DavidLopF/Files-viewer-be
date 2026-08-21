'use strict'

/**
 * Minimal cache-aside store with a fixed TTL per entry. The provider's
 * file catalog is small, so an unbounded Map is fine here.
 */
class InMemoryTtlCache {
  /**
   * @param {number} ttlMs - Time to live for each entry, in milliseconds.
   */
  constructor (ttlMs) {
    this.ttlMs = ttlMs
    this.store = new Map()
  }

  /**
   * @param {string} key
   * @returns {*} The cached value, or undefined on miss or expiry.
   */
  get (key) {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  /**
   * @param {string} key
   * @param {*} value
   */
  set (key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  clear () {
    this.store.clear()
  }
}

module.exports = InMemoryTtlCache
