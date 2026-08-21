'use strict'

const EXPECTED_COLUMNS = 4
const HEX_32_PATTERN = /^[0-9a-fA-F]{32}$/
const INTEGER_PATTERN = /^-?\d+$/

/**
 * Requires exactly `file,text,number,hex` with no empty field. This is the
 * literal reading of the spec ("lines that don't have enough data") and is
 * the default strategy.
 *
 * @param {string[]} fields
 * @returns {boolean}
 */
function strictColumnCount (fields) {
  if (fields.length !== EXPECTED_COLUMNS) return false
  return fields.every((field) => field.length > 0)
}

/**
 * Same shape check as strictColumnCount, plus type enforcement on
 * `number` (integer) and `hex` (32 hex chars). Opt-in via config since the
 * spec only requires the shape check.
 *
 * @param {string[]} fields
 * @returns {boolean}
 */
function strictTypes (fields) {
  if (!strictColumnCount(fields)) return false
  const [, , number, hex] = fields
  return INTEGER_PATTERN.test(number) && HEX_32_PATTERN.test(hex)
}

const strategies = {
  strictColumnCount,
  strictTypes
}

/**
 * @param {string} name - Key into `strategies`.
 * @returns {(fields: string[]) => boolean}
 * @throws {Error} If `name` does not match a known strategy.
 */
function getValidator (name) {
  const validator = strategies[name]
  if (!validator) {
    throw new Error(`Unknown line validation strategy: ${name}`)
  }
  return validator
}

module.exports = { strictColumnCount, strictTypes, getValidator }
