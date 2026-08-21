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
    expect(response.headers['x-skipped-file-names']).to.equal('[]')
  })

  it('exposes the skipped-files headers through CORS so browsers can read them', async () => {
    mockCatalog(['itg-cors.csv'])
    mockDownload('itg-cors.csv', TEST1_CSV)

    const response = await request(app).get('/files/data')

    expect(response.headers['access-control-expose-headers']).to.include('X-Skipped-Files')
    expect(response.headers['access-control-expose-headers']).to.include('X-Skipped-File-Names')
  })

  it('omits a file whose download fails but keeps the response at 200, naming it in the header', async () => {
    mockCatalog(['itg-ok.csv', 'itg-fail.csv'])
    mockDownload('itg-ok.csv', TEST1_CSV)
    mockDownloadFailure('itg-fail.csv')

    const response = await request(app).get('/files/data')

    expect(response.status).to.equal(200)
    expect(response.body.map((f) => f.file)).to.deep.equal(['itg-ok.csv'])
    expect(response.headers['x-skipped-files']).to.equal('1')
    expect(JSON.parse(response.headers['x-skipped-file-names'])).to.deep.equal(['itg-fail.csv'])
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

  it('returns every file matching fileName as a case-insensitive substring', async () => {
    mockCatalog(['itg-report-a.csv', 'itg-report-b.csv', 'itg-other.csv'])
    mockDownload('itg-report-a.csv', TEST1_CSV)
    mockDownload('itg-report-b.csv', TEST1_CSV)

    const response = await request(app).get('/files/data?fileName=REPORT')

    expect(response.status).to.equal(200)
    expect(response.body.map((f) => f.file)).to.deep.equal(['itg-report-a.csv', 'itg-report-b.csv'])
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

  it('GET /files/list returns every catalog file that downloads successfully', async () => {
    mockCatalog(['itg-list-a.csv', 'itg-list-b.csv'])
    mockDownload('itg-list-a.csv', TEST1_CSV)
    mockDownload('itg-list-b.csv', TEST1_CSV)

    const response = await request(app).get('/files/list')

    expect(response.status).to.equal(200)
    expect(response.body).to.deep.equal({ files: ['itg-list-a.csv', 'itg-list-b.csv'] })
  })

  it('GET /files/list omits a catalog file whose download fails', async () => {
    mockCatalog(['itg-list-ok.csv', 'itg-list-broken.csv'])
    mockDownload('itg-list-ok.csv', TEST1_CSV)
    mockDownloadFailure('itg-list-broken.csv')

    const response = await request(app).get('/files/list')

    expect(response.status).to.equal(200)
    expect(response.body).to.deep.equal({ files: ['itg-list-ok.csv'] })
  })

  it('GET /files/list returns 502 UPSTREAM_ERROR when the provider fails', async () => {
    nock(config.provider.baseUrl)
      .get(config.provider.listPath)
      .times(3)
      .reply(500)

    const response = await request(app).get('/files/list')

    expect(response.status).to.equal(502)
    expect(response.body.error.code).to.equal('UPSTREAM_ERROR')
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
