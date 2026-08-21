'use strict'

const http = require('http')
const https = require('https')
const axios = require('axios')
const config = require('../../config')

const keepAliveHttpAgent = new http.Agent({ keepAlive: true })
const keepAliveHttpsAgent = new https.Agent({ keepAlive: true })

/**
 * Axios instance preconfigured for the TBX provider: base URL, bearer auth,
 * a bounded timeout and keep-alive sockets so retries don't pay a fresh
 * TCP/TLS handshake each time.
 */
const httpClient = axios.create({
  baseURL: config.provider.baseUrl,
  timeout: config.http.timeoutMs,
  httpAgent: keepAliveHttpAgent,
  httpsAgent: keepAliveHttpsAgent,
  headers: {
    Authorization: `Bearer ${config.provider.authToken}`
  }
})

module.exports = httpClient
