'use strict'

const { expect } = require('chai')
const { mapLine } = require('../../src/domain/fileDataMapper')

describe('fileDataMapper', () => {
  it('maps a validated row to the public line DTO', () => {
    const line = mapLine(['test1.csv', 'RgTya', '64075909', '70ad29aacf0b690b0467fe2b2767f765'])

    expect(line).to.deep.equal({
      text: 'RgTya',
      number: 64075909,
      hex: '70ad29aacf0b690b0467fe2b2767f765'
    })
  })

  it('emits number as a JS number, not a string', () => {
    const line = mapLine(['test1.csv', 'a', '0', 'b'])

    expect(line.number).to.be.a('number')
    expect(line.number).to.equal(0)
  })
})
