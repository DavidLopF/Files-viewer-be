'use strict'

/**
 * Builds the getFilesList use case: exposes the provider's raw file
 * catalog, in the order the provider returns it.
 *
 * @param {{ repo: { listFiles: () => Promise<string[]> } }} deps
 * @returns {() => Promise<string[]>}
 */
function createGetFilesList ({ repo }) {
  return function getFilesList () {
    return repo.listFiles()
  }
}

module.exports = { createGetFilesList }
