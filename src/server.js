'use strict'

const app = require('./app')
const config = require('./config')

app.listen(config.port, () => {
  console.log(`tbx-files-api listening on port ${config.port}`)
})
