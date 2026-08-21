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
 * Builds the files use cases that share a download+parse+cache pipeline:
 * `getFilesData` lists the provider's catalog, downloads each file through
 * a bounded concurrency pool, parses and validates its lines, and returns
 * them in catalog order. `fileName` is matched as a case-insensitive
 * substring against the catalog, not an exact name, so it behaves as a
 * search rather than a single-file lookup; no match is a 404. A failed
 * download never aborts the batch, except when the search narrows to
 * exactly one file: there, the caller asked for that file specifically, so
 * the failure is rethrown instead of being silently skipped.
 *
 * `getAvailableFileNames` reuses the same pipeline to report only the
 * catalog entries that actually download successfully. The provider's
 * catalog can list files that are permanently broken on its end; nothing
 * short of attempting the download reveals that, so this pays the same
 * cost as a full listing, offset by the per-file cache both use cases
 * share.
 *
 * @param {{ repo: FilesRepository, cache: { get: (key: string) => *, set: (key: string, value: *) => void }, concurrencyLimit: number, validationStrategy: string }} deps
 * @returns {{
 *   getFilesData: (options?: { fileName?: string }) => Promise<{ files: FileData[], skippedCount: number, skippedFileNames: string[] }>,
 *   getAvailableFileNames: () => Promise<string[]>
 * }}
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

  async function downloadWithSkips (fileNames) {
    const settled = await runWithConcurrency(fileNames, concurrencyLimit, fetchFileData)

    const files = []
    const skippedFileNames = []
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        files.push(result.value)
      } else {
        skippedFileNames.push(fileNames[index])
      }
    })

    return { files, skippedCount: skippedFileNames.length, skippedFileNames }
  }

  async function getFilesData ({ fileName } = {}) {
    const catalog = await repo.listFiles()

    if (fileName) {
      const needle = fileName.toLowerCase()
      const matches = catalog.filter((name) => name.toLowerCase().includes(needle))

      if (matches.length === 0) {
        throw new FileNotFoundError(fileName)
      }

      if (matches.length === 1) {
        const fileData = await fetchFileData(matches[0])
        return { files: [fileData], skippedCount: 0, skippedFileNames: [] }
      }

      return downloadWithSkips(matches)
    }

    return downloadWithSkips(catalog)
  }

  async function getAvailableFileNames () {
    const catalog = await repo.listFiles()
    const { files } = await downloadWithSkips(catalog)
    return files.map((fileData) => fileData.file)
  }

  return { getFilesData, getAvailableFileNames }
}

module.exports = { createGetFilesData }
