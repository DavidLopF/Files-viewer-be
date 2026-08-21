'use strict'

const express = require('express')
const cors = require('cors')
const config = require('./config')
const httpClient = require('./infrastructure/http/httpClient')
const { createTbxFilesGateway } = require('./infrastructure/gateways/tbxFilesGateway')
const InMemoryTtlCache = require('./infrastructure/cache/inMemoryTtlCache')
const { createGetFilesData } = require('./application/getFilesData')
const { createGetFilesList } = require('./application/getFilesList')
const { createFilesController } = require('./interfaces/http/controllers/filesController')
const { createFilesRouter } = require('./interfaces/http/routes/filesRoutes')
const requestLogger = require('./interfaces/http/middlewares/requestLogger')
const errorHandler = require('./interfaces/http/middlewares/errorHandler')

function buildApp () {
  const repo = createTbxFilesGateway({ httpClient })
  const cache = new InMemoryTtlCache(config.cache.ttlMs)

  const getFilesData = createGetFilesData({
    repo,
    cache,
    concurrencyLimit: config.concurrency.limit,
    validationStrategy: config.validation.strategy
  })
  const getFilesList = createGetFilesList({ repo })
  const filesController = createFilesController({ getFilesData, getFilesList })

  const app = express()

  app.use(cors({ exposedHeaders: ['X-Skipped-Files'] }))
  app.use(requestLogger)

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })

  app.use(createFilesRouter(filesController))

  app.use(errorHandler)

  return app
}

module.exports = buildApp()
