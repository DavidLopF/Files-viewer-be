'use strict'

const { AppError } = require('../../../shared/errors/AppError')

/**
 * Single point where thrown errors become HTTP responses. Typed AppError
 * instances carry their own status and code; anything else is unexpected
 * and maps to 500 INTERNAL_ERROR so internals never leak to the client.
 */
function errorHandler (err, req, res, next) { // eslint-disable-line no-unused-vars
  const isAppError = err instanceof AppError

  if (!isAppError) {
    console.error(err)
  }

  const statusCode = isAppError ? err.statusCode : 500
  const code = isAppError ? err.code : 'INTERNAL_ERROR'
  const message = isAppError ? err.message : 'An unexpected error occurred'

  res.status(statusCode).json({ error: { code, message } })
}

module.exports = errorHandler
