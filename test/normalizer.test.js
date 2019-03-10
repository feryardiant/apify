const test = require('tape')
const { normalize } = require('../lib/normalizer')

const rawData = {
  albums: [
    {
      id: 1,
      users: { name: 'John Doe' },
      name: 'Foo Bar',
      images: [
        { url: 'example.com/image.jpg' },
        { url: 'example.com/image.jpg' }
      ]
    },
    {
      id: 2,
      users: { name: 'Jane Doe' },
      name: 'Bar Baz',
      images: [
        { url: 'example.com/image.jpg' },
        { url: 'example.com/image.jpg' },
        { url: 'example.com/image.jpg' }
      ]
    }
  ]
}

test('Data normalizer', t => {
  const normalized = normalize(rawData)

  t.is(Object.keys(normalized).length, 3, 'Should resulting 3 tables')

  t.end()
})
