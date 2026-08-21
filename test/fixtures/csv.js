'use strict'

const HEADER = 'file,text,number,hex'

const TEST1_CSV = [
  HEADER,
  'test1.csv,RgTya,64075909,70ad29aacf0b690b0467fe2b2767f765',
  'test1.csv,,,',
  'test1.csv,AtjW'
].join('\n')

const TEST2_CSV = [
  HEADER,
  'test2.csv,BnmQ,12345,ffffffffffffffffffffffffffffffff'
].join('\n')

module.exports = { HEADER, TEST1_CSV, TEST2_CSV }
