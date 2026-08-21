'use strict'

/**
 * Parses raw CSV text into rows of trimmed string fields. The header row
 * (first non-empty line) is discarded. Handles both LF and CRLF line
 * endings and ignores blank lines, including a trailing newline at EOF.
 *
 * @param {string} csvText - Raw CSV content, header included.
 * @returns {string[][]} One array of trimmed fields per data row.
 */
function parseCsv (csvText) {
  if (!csvText) return []

  const lines = csvText
    .split(/\r\n|\n/)
    .filter((line) => line.trim().length > 0)

  const dataLines = lines.slice(1)

  return dataLines.map((line) => line.split(',').map((field) => field.trim()))
}

module.exports = { parseCsv }
