'use strict'

/**
 * Base class for errors that carry an HTTP status and a machine-readable code.
 * The errorHandler middleware is the only place that translates these into responses.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human readable message.
   * @param {number} statusCode - HTTP status to respond with.
   * @param {string} code - Machine readable error code exposed in the response body.
   */
  constructor (message, statusCode, code) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}

class FileNotFoundError extends AppError {
  /**
   * @param {string} fileName
   */
  constructor (fileName) {
    super(`File '${fileName}' was not found`, 404, 'FILE_NOT_FOUND')
  }
}

class UpstreamError extends AppError {
  /**
   * @param {string} [message]
   */
  constructor (message = 'The upstream provider failed to respond') {
    super(message, 502, 'UPSTREAM_ERROR')
  }
}

class ValidationError extends AppError {
  /**
   * @param {string} message
   */
  constructor (message) {
    super(message, 400, 'INVALID_QUERY')
  }
}

module.exports = {
  AppError,
  FileNotFoundError,
  UpstreamError,
  ValidationError
}
