'use strict'

const config = require('../../config')
const { withRetry } = require('../async/retry')
const { UpstreamError } = require('../../shared/errors/AppError')

/**
 * @typedef {Object} FilesGateway
 * @property {() => Promise<string[]>} listFiles
 * @property {(fileName: string) => Promise<string>} downloadFile
 */

/**
 * Adapter over the TBX provider. Owns the provider's base URL, auth header
 * and payload shape, and turns transport failures into UpstreamError so
 * upstream layers never see axios error shapes.
 *
 * @param {{ httpClient: import('axios').AxiosInstance }} deps
 * @returns {FilesGateway}
 */
function createTbxFilesGateway ({ httpClient }) {
  const retryOptions = {
    attempts: config.retry.attempts,
    baseDelayMs: config.retry.baseDelayMs
  }

  async function listFiles () {
    try {
      const response = await withRetry(
        () => httpClient.get(config.provider.listPath),
        retryOptions
      )
      return response.data.files
    } catch (error) {
      throw new UpstreamError('Could not retrieve the file list from the provider')
    }
  }

  async function downloadFile (fileName) {
    try {
      const response = await withRetry(
        () => httpClient.get(`${config.provider.filePath}/${encodeURIComponent(fileName)}`),
        retryOptions
      )
      return response.data
    } catch (error) {
      throw new UpstreamError(`Could not download file '${fileName}' from the provider`)
    }
  }

  return { listFiles, downloadFile }
}

module.exports = { createTbxFilesGateway }
