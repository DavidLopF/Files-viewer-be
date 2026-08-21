'use strict'

const { expect } = require('chai')
const { strictColumnCount, strictTypes, getValidator } = require('../../src/domain/lineValidators')

describe('lineValidators', () => {
  describe('strictColumnCount', () => {
    it('accepts a row with exactly 4 non-empty columns', () => {
      expect(strictColumnCount(['test1.csv', 'RgTya', '64075909', 'abc123'])).to.equal(true)
    })

    it('rejects a row with 3 columns', () => {
      expect(strictColumnCount(['test1.csv', 'AtjW', '1'])).to.equal(false)
    })

    it('rejects a row with 5 columns', () => {
      expect(strictColumnCount(['test1.csv', 'a', '1', 'b', 'extra'])).to.equal(false)
    })

    it('rejects a row with an empty field', () => {
      expect(strictColumnCount(['test1.csv', '', '1', 'b'])).to.equal(false)
    })
  })

  describe('strictTypes', () => {
    const validHex = '70ad29aacf0b690b0467fe2b2767f765'

    it('accepts a row with an integer number and a 32-char hex', () => {
      expect(strictTypes(['test1.csv', 'RgTya', '64075909', validHex])).to.equal(true)
    })

    it('rejects a non-numeric number field', () => {
      expect(strictTypes(['test1.csv', 'RgTya', 'not-a-number', validHex])).to.equal(false)
    })

    it('rejects a hex field of the wrong length', () => {
      expect(strictTypes(['test1.csv', 'RgTya', '1', 'abc123'])).to.equal(false)
    })

    it('rejects rows that already fail the shape check', () => {
      expect(strictTypes(['test1.csv', 'RgTya', '1'])).to.equal(false)
    })
  })

  describe('getValidator', () => {
    it('resolves a known strategy by name', () => {
      expect(getValidator('strictColumnCount')).to.equal(strictColumnCount)
      expect(getValidator('strictTypes')).to.equal(strictTypes)
    })

    it('throws for an unknown strategy name', () => {
      expect(() => getValidator('nonsense')).to.throw(/Unknown line validation strategy/)
    })
  })
})
