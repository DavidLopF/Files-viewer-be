'use strict'

const { expect } = require('chai')
const { createGetFilesList } = require('../../src/application/getFilesList')

describe('getFilesList', () => {
  it('returns the catalog from the repository', async () => {
    const repo = { listFiles: () => Promise.resolve(['test1.csv', 'test2.csv']) }
    const getFilesList = createGetFilesList({ repo })

    const files = await getFilesList()

    expect(files).to.deep.equal(['test1.csv', 'test2.csv'])
  })
})
