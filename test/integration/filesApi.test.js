'use strict'

const { expect } = require('chai')
const request = require('supertest')
const nock = require('nock')
const config = require('../../src/config')
const app = require('../../src/app')
const { TEST1_CSV, HEADER } = require('../fixtures/csv')

function mockCatalog (files) {
  return nock(config.provider.baseUrl)
    .get(config.provider.listPath)
    .reply(200, { files })
}

function mockDownload (fileName, csvBody) {
  return nock(config.provider.baseUrl)
    .get(`${config.provider.filePath}/${fileName}`)
    .reply(200, csvBody, { 'Content-Type': 'text/plain' })
}

function mockDownloadFailure (fileName, status = 500) {
  return nock(config.provider.baseUrl)
    .get(`${config.provider.filePath}/${fileName}`)
    .times(3)
    .reply(status)
}

describe('files API (integration)', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  it('GET /files/data returns the frozen payload shape with the right content-type', async () => {
    mockCatalog(['itg-shape.csv'])
    mockDownload('itg-shape.csv', TEST1_CSV)

    const response = await request(app).get('/files/data')

    expect(response.status).to.equal(200)
    expect(response.headers['content-type']).to.match(/application\/json/)
    expect(response.body).to.deep.equal([
      {
        file: 'itg-shape.csv',
        lines: [{ text: 'RgTya', number: 64075909, hex: '70ad29aacf0b690b0467fe2b2767f765' }]
      }
    ])
    expect(response.headers['x-skipped-files']).to.equal('0')
  })

  it('exposes X-Skipped-Files through CORS so browsers can read it', async () => {
    mockCatalog(['itg-cors.csv'])
    mockDownload('itg-cors.csv', TEST1_CSV)

    const response = await request(app).get('/files/data')

    expect(response.headers['access-control-expose-headers']).to.include('X-Skipped-Files')
  })

  it('omits a file whose download fails but keeps the response at 200', async () => {
    mockCatalog(['itg-ok.csv', 'itg-fail.csv'])
    mockDownload('itg-ok.csv', TEST1_CSV)
    mockDownloadFailure('itg-fail.csv')

    const response = await request(app).get('/files/data')

    expect(response.status).to.equal(200)
    expect(response.body.map((f) => f.file)).to.deep.equal(['itg-ok.csv'])
    expect(response.headers['x-skipped-files']).to.equal('1')
  })

  it('returns 502 UPSTREAM_ERROR when the provider catalog fails', async () => {
    nock(config.provider.baseUrl)
      .get(config.provider.listPath)
      .times(3)
      .reply(500)

    const response = await request(app).get('/files/data')

    expect(response.status).to.equal(502)
    expect(response.body).to.deep.equal({
      error: {
        code: 'UPSTREAM_ERROR',
        message: 'Could not retrieve the file list from the provider'
      }
    })
  })

  it('returns 404 FILE_NOT_FOUND for a fileName absent from the catalog', async () => {
    mockCatalog(['itg-known.csv'])

    const response = await request(app).get('/files/data?fileName=itg-missing.csv')

    expect(response.status).to.equal(404)
    expect(response.body.error.code).to.equal('FILE_NOT_FOUND')
  })

  it('returns 502 UPSTREAM_ERROR when the requested fileName fails to download', async () => {
    mockCatalog(['itg-baddl.csv'])
    mockDownloadFailure('itg-baddl.csv')

    const response = await request(app).get('/files/data?fileName=itg-baddl.csv')

    expect(response.status).to.equal(502)
    expect(response.body.error.code).to.equal('UPSTREAM_ERROR')
  })

  it('returns 400 INVALID_QUERY for a path traversal fileName', async () => {
    const response = await request(app).get('/files/data?fileName=' + encodeURIComponent('../../etc/passwd'))

    expect(response.status).to.equal(400)
    expect(response.body.error.code).to.equal('INVALID_QUERY')
  })

  it('returns 400 INVALID_QUERY for an empty fileName', async () => {
    const response = await request(app).get('/files/data?fileName=')

    expect(response.status).to.equal(400)
    expect(response.body.error.code).to.equal('INVALID_QUERY')
  })

  it('GET /files/list returns the raw catalog', async () => {
    mockCatalog(['itg-list-a.csv', 'itg-list-b.csv'])

    const response = await request(app).get('/files/list')

    expect(response.status).to.equal(200)
    expect(response.body).to.deep.equal({ files: ['itg-list-a.csv', 'itg-list-b.csv'] })
  })

  it('GET /health reports ok status and uptime', async () => {
    const response = await request(app).get('/health')

    expect(response.status).to.equal(200)
    expect(response.body.status).to.equal('ok')
    expect(response.body.uptime).to.be.a('number')
  })

  it('includes a downloaded file with no valid lines as lines: []', async () => {
    mockCatalog(['itg-empty.csv'])
    mockDownload('itg-empty.csv', HEADER)

    const response = await request(app).get('/files/data')

    expect(response.body).to.deep.equal([{ file: 'itg-empty.csv', lines: [] }])
  })
})
