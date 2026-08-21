'use strict'

/**
 * Thin HTTP facade over the files use cases: translates request/response
 * concerns only, all behavior lives in the application layer.
 *
 * @param {{ getFilesData: Function, getFilesList: Function }} useCases
 */
function createFilesController ({ getFilesData, getFilesList }) {
  async function data (req, res, next) {
    try {
      const { files, skippedCount } = await getFilesData({ fileName: req.query.fileName })
      res.set('X-Skipped-Files', String(skippedCount))
      res.json(files)
    } catch (error) {
      next(error)
    }
  }

  async function list (req, res, next) {
    try {
      const files = await getFilesList()
      res.json({ files })
    } catch (error) {
      next(error)
    }
  }

  return { data, list }
}

module.exports = { createFilesController }
