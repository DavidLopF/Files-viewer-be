'use strict'

/**
 * Central configuration object. Every value has a working default so the
 * app boots with `npm install && npm start` alone; environment variables
 * are read only as optional overrides.
 */
const config = {
  port: Number(process.env.PORT) || 3000,

  provider: {
    baseUrl: process.env.TBX_BASE_URL || 'https://echo-serv.tbxnet.com',
    authToken: process.env.TBX_AUTH_TOKEN || 'aSuperSecretKey',
    listPath: '/v1/secret/files',
    filePath: '/v1/secret/file'
  },

  http: {
    timeoutMs: Number(process.env.TBX_TIMEOUT_MS) || 5000
  },

  retry: {
    attempts: 2,
    baseDelayMs: 300
  },

  concurrency: {
    limit: Number(process.env.TBX_CONCURRENCY) || 5
  },

  cache: {
    ttlMs: Number(process.env.TBX_CACHE_TTL_MS) || 60000
  },

  validation: {
    // 'strictColumnCount' (default) only checks shape; 'strictTypes' also
    // validates that number/hex hold well-formed values. See README.
    strategy: process.env.TBX_VALIDATION_STRATEGY || 'strictColumnCount'
  }
}

module.exports = config
