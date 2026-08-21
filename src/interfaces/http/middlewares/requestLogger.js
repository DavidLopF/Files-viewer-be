'use strict'

/**
 * Logs one line per request once the response has finished, including
 * status code and duration.
 */
function requestLogger (req, res, next) {
  const startedAt = Date.now()

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`)
  })

  next()
}

module.exports = requestLogger
