import test from 'tape'
import api from '../src/api'

test('dummy test', (t) => {
  t.is(typeof api, 'function')
  t.end()
})
