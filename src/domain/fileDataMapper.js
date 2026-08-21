'use strict'

/**
 * Maps a validated CSV row (`file,text,number,hex`) to the public line DTO.
 * Assumes the row already passed a line validator — no shape checks here.
 *
 * @param {string[]} fields - Trimmed CSV fields, in column order.
 * @returns {{ text: string, number: number, hex: string }}
 */
function mapLine (fields) {
  const [, text, number, hex] = fields
  return {
    text,
    number: Number(number),
    hex
  }
}

module.exports = { mapLine }
