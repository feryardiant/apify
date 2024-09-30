import test from 'tape'
import api from '../api/index'

test('dummy test', (t) => {
  t.is(typeof api, 'function')
  t.end()
})
