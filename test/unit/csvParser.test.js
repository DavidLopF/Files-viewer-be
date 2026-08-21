'use strict'

const { expect } = require('chai')
const { parseCsv } = require('../../src/domain/csvParser')

describe('csvParser', () => {
  it('discards the header and parses data rows', () => {
    const csv = 'file,text,number,hex\ntest1.csv,RgTya,64075909,70ad29aacf0b690b0467fe2b2767f765'

    const rows = parseCsv(csv)

    expect(rows).to.deep.equal([
      ['test1.csv', 'RgTya', '64075909', '70ad29aacf0b690b0467fe2b2767f765']
    ])
  })

  it('returns an empty array when only the header is present', () => {
    const rows = parseCsv('file,text,number,hex')

    expect(rows).to.deep.equal([])
  })

  it('returns an empty array for an empty string', () => {
    expect(parseCsv('')).to.deep.equal([])
  })

  it('handles CRLF line endings', () => {
    const csv = 'file,text,number,hex\r\ntest1.csv,AtjW,1,abc'

    const rows = parseCsv(csv)

    expect(rows).to.deep.equal([['test1.csv', 'AtjW', '1', 'abc']])
  })

  it('handles a mix of LF endings and a missing trailing newline', () => {
    const csv = 'file,text,number,hex\ntest1.csv,a,1,b\ntest1.csv,c,2,d'

    const rows = parseCsv(csv)

    expect(rows).to.have.lengthOf(2)
    expect(rows[1]).to.deep.equal(['test1.csv', 'c', '2', 'd'])
  })

  it('ignores blank lines, including a trailing newline at EOF', () => {
    const csv = 'file,text,number,hex\ntest1.csv,a,1,b\n\n'

    const rows = parseCsv(csv)

    expect(rows).to.deep.equal([['test1.csv', 'a', '1', 'b']])
  })

  it('trims whitespace around each field', () => {
    const csv = 'file,text,number,hex\n test1.csv , a , 1 , b '

    const rows = parseCsv(csv)

    expect(rows).to.deep.equal([['test1.csv', 'a', '1', 'b']])
  })

  it('preserves short rows so validators can reject them downstream', () => {
    const csv = 'file,text,number,hex\ntest1.csv,,,\ntest1.csv,AtjW'

    const rows = parseCsv(csv)

    expect(rows).to.deep.equal([
      ['test1.csv', '', '', ''],
      ['test1.csv', 'AtjW']
    ])
  })
})
