import assert from 'node:assert/strict'
import { messageIdentityKey, normalizeMessage } from '../src/components/chatUtils.js'

const first = normalizeMessage({
  id: 21,
  sender: 'bot',
  text: 'Produk tersedia.',
})
const second = normalizeMessage({
  id: 22,
  sender: 'bot',
  text: 'Produk tersedia.',
})

assert.notEqual(messageIdentityKey(first), messageIdentityKey(second))
assert.equal(messageIdentityKey(first), 'bot::21')
console.log('PASS: identical messages retain distinct highlight identities')
