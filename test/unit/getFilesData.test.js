'use strict'

const { expect } = require('chai')
const { createGetFilesData } = require('../../src/application/getFilesData')
const { FileNotFoundError, UpstreamError } = require('../../src/shared/errors/AppError')

const HEADER = 'file,text,number,hex\n'

function csvFor (fileName) {
  return `${HEADER}${fileName},RgTya,64075909,70ad29aacf0b690b0467fe2b2767f765`
}

function createFakeRepo ({ catalog, content = {}, failing = new Set(), delays = {} }) {
  const downloadCalls = []
  return {
    downloadCalls,
    listFiles: () => Promise.resolve(catalog),
    downloadFile: async (fileName) => {
      downloadCalls.push(fileName)
      if (delays[fileName]) await new Promise((resolve) => setTimeout(resolve, delays[fileName]))
      if (failing.has(fileName)) throw new UpstreamError(`download failed for ${fileName}`)
      return content[fileName] !== undefined ? content[fileName] : csvFor(fileName)
    }
  }
}

function createNoopCache () {
  const store = new Map()
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value)
  }
}

const baseDeps = { concurrencyLimit: 5, validationStrategy: 'strictColumnCount' }

describe('getFilesData', () => {
  it('returns parsed lines for every file when all downloads succeed', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv', 'test2.csv'] })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData()

    expect(result.skippedCount).to.equal(0)
    expect(result.files).to.deep.equal([
      { file: 'test1.csv', lines: [{ text: 'RgTya', number: 64075909, hex: '70ad29aacf0b690b0467fe2b2767f765' }] },
      { file: 'test2.csv', lines: [{ text: 'RgTya', number: 64075909, hex: '70ad29aacf0b690b0467fe2b2767f765' }] }
    ])
  })

  it('omits a file that fails to download and counts it as skipped', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv', 'test2.csv'], failing: new Set(['test2.csv']) })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData()

    expect(result.skippedCount).to.equal(1)
    expect(result.skippedFileNames).to.deep.equal(['test2.csv'])
    expect(result.files.map((f) => f.file)).to.deep.equal(['test1.csv'])
  })

  it('returns an empty list with all files skipped when every download fails', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv', 'test2.csv'], failing: new Set(['test1.csv', 'test2.csv']) })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData()

    expect(result.files).to.deep.equal([])
    expect(result.skippedCount).to.equal(2)
    expect(result.skippedFileNames).to.deep.equal(['test1.csv', 'test2.csv'])
  })

  it('returns an empty list when the catalog is empty', async () => {
    const repo = createFakeRepo({ catalog: [] })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData()

    expect(result).to.deep.equal({ files: [], skippedCount: 0, skippedFileNames: [] })
  })

  it('includes a successfully downloaded file with no valid lines as lines: []', async () => {
    const repo = createFakeRepo({ catalog: ['empty.csv'], content: { 'empty.csv': HEADER } })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData()

    expect(result.files).to.deep.equal([{ file: 'empty.csv', lines: [] }])
  })

  it('preserves catalog order regardless of which download resolves first', async () => {
    const repo = createFakeRepo({
      catalog: ['slow.csv', 'fast.csv'],
      delays: { 'slow.csv': 20, 'fast.csv': 0 }
    })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData()

    expect(result.files.map((f) => f.file)).to.deep.equal(['slow.csv', 'fast.csv'])
  })

  it('throws FileNotFoundError when fileName is not in the catalog', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv'] })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    let thrown
    try {
      await getFilesData({ fileName: 'missing.csv' })
    } catch (error) {
      thrown = error
    }

    expect(thrown).to.be.instanceOf(FileNotFoundError)
  })

  it('rethrows the download error when the requested fileName fails, instead of skipping it', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv'], failing: new Set(['test1.csv']) })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    let thrown
    try {
      await getFilesData({ fileName: 'test1.csv' })
    } catch (error) {
      thrown = error
    }

    expect(thrown).to.be.instanceOf(UpstreamError)
  })

  it('returns a single-element array when fileName matches exactly one file', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv', 'test2.csv'] })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData({ fileName: 'test2.csv' })

    expect(result.files).to.have.lengthOf(1)
    expect(result.files[0].file).to.equal('test2.csv')
  })

  it('matches fileName as a case-insensitive substring, not an exact name', async () => {
    const repo = createFakeRepo({ catalog: ['Report-2024.csv', 'notes.csv'] })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData({ fileName: 'report' })

    expect(result.files.map((f) => f.file)).to.deep.equal(['Report-2024.csv'])
  })

  it('returns every file whose name contains the search text', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv', 'test2.csv', 'other.csv'] })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData({ fileName: 'test' })

    expect(result.files.map((f) => f.file)).to.deep.equal(['test1.csv', 'test2.csv'])
    expect(result.skippedCount).to.equal(0)
  })

  it('skips a failing file within a multi-match search instead of rethrowing', async () => {
    const repo = createFakeRepo({
      catalog: ['test1.csv', 'test2.csv'],
      failing: new Set(['test2.csv'])
    })
    const { getFilesData } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const result = await getFilesData({ fileName: 'test' })

    expect(result.files.map((f) => f.file)).to.deep.equal(['test1.csv'])
    expect(result.skippedCount).to.equal(1)
    expect(result.skippedFileNames).to.deep.equal(['test2.csv'])
  })

  it('serves a repeated request for the same file from cache', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv'] })
    const cache = createNoopCache()
    const { getFilesData } = createGetFilesData({ repo, cache, ...baseDeps })

    await getFilesData({ fileName: 'test1.csv' })
    await getFilesData({ fileName: 'test1.csv' })

    expect(repo.downloadCalls).to.deep.equal(['test1.csv'])
  })
})

describe('getAvailableFileNames', () => {
  it('returns every catalog file when all downloads succeed', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv', 'test2.csv'] })
    const { getAvailableFileNames } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const names = await getAvailableFileNames()

    expect(names).to.deep.equal(['test1.csv', 'test2.csv'])
  })

  it('excludes catalog entries whose download fails', async () => {
    const repo = createFakeRepo({
      catalog: ['test1.csv', 'test2.csv', 'test3.csv'],
      failing: new Set(['test2.csv'])
    })
    const { getAvailableFileNames } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const names = await getAvailableFileNames()

    expect(names).to.deep.equal(['test1.csv', 'test3.csv'])
  })

  it('includes a file that downloads successfully but has no valid lines', async () => {
    const repo = createFakeRepo({ catalog: ['empty.csv'], content: { 'empty.csv': HEADER } })
    const { getAvailableFileNames } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const names = await getAvailableFileNames()

    expect(names).to.deep.equal(['empty.csv'])
  })

  it('returns an empty list when every download fails', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv'], failing: new Set(['test1.csv']) })
    const { getAvailableFileNames } = createGetFilesData({ repo, cache: createNoopCache(), ...baseDeps })

    const names = await getAvailableFileNames()

    expect(names).to.deep.equal([])
  })

  it('shares the per-file cache with getFilesData', async () => {
    const repo = createFakeRepo({ catalog: ['test1.csv'] })
    const cache = createNoopCache()
    const { getFilesData, getAvailableFileNames } = createGetFilesData({ repo, cache, ...baseDeps })

    await getFilesData({ fileName: 'test1.csv' })
    await getAvailableFileNames()

    expect(repo.downloadCalls).to.deep.equal(['test1.csv'])
  })
})
