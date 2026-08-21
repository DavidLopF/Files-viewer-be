'use strict'

const { parseCsv } = require('../domain/csvParser')
const { getValidator } = require('../domain/lineValidators')
const { mapLine } = require('../domain/fileDataMapper')
const { runWithConcurrency } = require('../infrastructure/async/concurrencyPool')
const { FileNotFoundError } = require('../shared/errors/AppError')

/**
 * @typedef {Object} FilesRepository
 * @property {() => Promise<string[]>} listFiles
 * @property {(fileName: string) => Promise<string>} downloadFile
 */

/**
 * @typedef {Object} FileData
 * @property {string} file
 * @property {Array<{ text: string, number: number, hex: string }>} lines
 */

/**
 * Builds the getFilesData use case: lists the provider's catalog, downloads
 * each file through a bounded concurrency pool, parses and validates its
 * lines, and returns them in catalog order. A failed download never aborts
 * the batch: in full-listing mode it is counted as skipped, in single-file
 * mode it is rethrown so the caller can see the failure.
 *
 * @param {{ repo: FilesRepository, cache: { get: (key: string) => *, set: (key: string, value: *) => void }, concurrencyLimit: number, validationStrategy: string }} deps
 * @returns {(options?: { fileName?: string }) => Promise<{ files: FileData[], skippedCount: number }>}
 */
function createGetFilesData ({ repo, cache, concurrencyLimit, validationStrategy }) {
  const isValidLine = getValidator(validationStrategy)

  async function fetchFileData (fileName) {
    const cached = cache.get(fileName)
    if (cached) return cached

    const csvText = await repo.downloadFile(fileName)
    const rows = parseCsv(csvText)
    const lines = rows.filter(isValidLine).map(mapLine)
    const fileData = { file: fileName, lines }

    cache.set(fileName, fileData)
    return fileData
  }

  return async function getFilesData ({ fileName } = {}) {
    const catalog = await repo.listFiles()

    if (fileName) {
      if (!catalog.includes(fileName)) {
        throw new FileNotFoundError(fileName)
      }
      const fileData = await fetchFileData(fileName)
      return { files: [fileData], skippedCount: 0 }
    }

    const settled = await runWithConcurrency(catalog, concurrencyLimit, fetchFileData)

    const files = []
    let skippedCount = 0
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        files.push(result.value)
      } else {
        skippedCount++
      }
    }

    return { files, skippedCount }
  }
}

module.exports = { createGetFilesData }
