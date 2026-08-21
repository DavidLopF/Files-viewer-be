'use strict'

const nock = require('nock')
const config = require('../src/config')

nock.disableNetConnect()
// Supertest boots the app on a real local socket; only the provider's
// domain needs to stay mocked.
nock.enableNetConnect('127.0.0.1')

// Gateways that get built once at require time (e.g. the app singleton)
// capture this value in their closure, so it must be set before any
// module under test is first required.
config.retry.baseDelayMs = 1
