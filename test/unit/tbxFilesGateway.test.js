'use strict'

const { expect } = require('chai')
const nock = require('nock')
const config = require('../../src/config')
const httpClient = require('../../src/infrastructure/http/httpClient')
const { createTbxFilesGateway } = require('../../src/infrastructure/gateways/tbxFilesGateway')
const { UpstreamError } = require('../../src/shared/errors/AppError')

describe('tbxFilesGateway', () => {
  const gateway = createTbxFilesGateway({ httpClient })

  before(() => {
    // Keep retry backoff negligible so the failure-path tests stay fast.
    config.retry.baseDelayMs = 1
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('listFiles', () => {
    it('returns the file names from the provider', async () => {
      nock(config.provider.baseUrl)
        .get(config.provider.listPath)
        .reply(200, { files: ['test1.csv', 'test2.csv'] })

      const files = await gateway.listFiles()

      expect(files).to.deep.equal(['test1.csv', 'test2.csv'])
    })

    it('sends the bearer token', async () => {
      nock(config.provider.baseUrl, {
        reqheaders: { authorization: `Bearer ${config.provider.authToken}` }
      })
        .get(config.provider.listPath)
        .reply(200, { files: [] })

      const files = await gateway.listFiles()

      expect(files).to.deep.equal([])
    })

    it('throws UpstreamError when the provider keeps failing', async () => {
      nock(config.provider.baseUrl)
        .get(config.provider.listPath)
        .times(3)
        .reply(500)

      let thrown
      try {
        await gateway.listFiles()
      } catch (error) {
        thrown = error
      }

      expect(thrown).to.be.instanceOf(UpstreamError)
      expect(thrown.statusCode).to.equal(502)
    })

    it('recovers after a transient 5xx', async () => {
      nock(config.provider.baseUrl)
        .get(config.provider.listPath)
        .reply(500)
        .get(config.provider.listPath)
        .reply(200, { files: ['test1.csv'] })

      const files = await gateway.listFiles()

      expect(files).to.deep.equal(['test1.csv'])
    })
  })

  describe('downloadFile', () => {
    it('returns the raw csv text', async () => {
      const csv = 'file,text,number,hex\ntest1.csv,a,1,b'
      nock(config.provider.baseUrl)
        .get(`${config.provider.filePath}/test1.csv`)
        .reply(200, csv, { 'Content-Type': 'text/plain' })

      const body = await gateway.downloadFile('test1.csv')

      expect(body).to.equal(csv)
    })

    it('throws UpstreamError when the download fails', async () => {
      nock(config.provider.baseUrl)
        .get(`${config.provider.filePath}/test1.csv`)
        .times(3)
        .reply(503)

      let thrown
      try {
        await gateway.downloadFile('test1.csv')
      } catch (error) {
        thrown = error
      }

      expect(thrown).to.be.instanceOf(UpstreamError)
    })
  })
})
