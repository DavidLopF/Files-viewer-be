'use strict'

/**
 * Thin HTTP facade over the files use cases: translates request/response
 * concerns only, all behavior lives in the application layer.
 *
 * @param {{ getFilesData: Function, getAvailableFileNames: Function }} useCases
 */
function createFilesController ({ getFilesData, getAvailableFileNames }) {
  async function data (req, res, next) {
    try {
      const { files, skippedCount, skippedFileNames } = await getFilesData({ fileName: req.query.fileName })
      res.set('X-Skipped-Files', String(skippedCount))
      res.set('X-Skipped-File-Names', JSON.stringify(skippedFileNames))
      res.json(files)
    } catch (error) {
      next(error)
    }
  }

  async function list (req, res, next) {
    try {
      const files = await getAvailableFileNames()
      res.json({ files })
    } catch (error) {
      next(error)
    }
  }

  return { data, list }
}

module.exports = { createFilesController }
