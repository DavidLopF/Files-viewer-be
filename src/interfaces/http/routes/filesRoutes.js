'use strict'

const { Router } = require('express')
const validateFileNameQuery = require('../middlewares/validateFileNameQuery')

/**
 * @param {{ data: Function, list: Function }} controller
 * @returns {import('express').Router}
 */
function createFilesRouter (controller) {
  const router = Router()

  router.get('/files/data', validateFileNameQuery, controller.data)
  router.get('/files/list', controller.list)

  return router
}

module.exports = { createFilesRouter }
