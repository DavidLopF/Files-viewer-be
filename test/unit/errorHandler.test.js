'use strict'

const { expect } = require('chai')
const errorHandler = require('../../src/interfaces/http/middlewares/errorHandler')
const { FileNotFoundError } = require('../../src/shared/errors/AppError')

function createFakeRes () {
  return {
    statusCode: undefined,
    body: undefined,
    status (code) {
      this.statusCode = code
      return this
    },
    json (payload) {
      this.body = payload
      return this
    }
  }
}

describe('errorHandler', () => {
  it('maps a typed AppError to its own status and code', () => {
    const res = createFakeRes()

    errorHandler(new FileNotFoundError('test1.csv'), {}, res, () => {})

    expect(res.statusCode).to.equal(404)
    expect(res.body).to.deep.equal({
      error: { code: 'FILE_NOT_FOUND', message: "File 'test1.csv' was not found" }
    })
  })

  it('maps an unexpected error to 500 INTERNAL_ERROR without leaking its message', () => {
    const res = createFakeRes()
    const realConsoleError = console.error
    console.error = () => {}

    try {
      errorHandler(new Error('database connection string is secret'), {}, res, () => {})
    } finally {
      console.error = realConsoleError
    }

    expect(res.statusCode).to.equal(500)
    expect(res.body).to.deep.equal({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    })
  })
})
