'use strict'

const { ValidationError } = require('../../../shared/errors/AppError')

const SAFE_FILENAME_PATTERN = /^[\w.-]+$/

/**
 * Rejects a malformed `fileName` query param before it reaches the
 * controller: repeated values, a blank string, path separators or
 * traversal segments.
 */
function validateFileNameQuery (req, res, next) {
  const { fileName } = req.query

  if (fileName === undefined) return next()

  if (Array.isArray(fileName) || typeof fileName !== 'string' || fileName.trim().length === 0) {
    return next(new ValidationError('Query parameter "fileName" must be a non-empty string'))
  }

  if (fileName.includes('..') || !SAFE_FILENAME_PATTERN.test(fileName)) {
    return next(new ValidationError('Query parameter "fileName" has an invalid format'))
  }

  next()
}

module.exports = validateFileNameQuery
