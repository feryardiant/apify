const test = require('tape')
const { Database, ApifyError } = require('../lib')

const rawData = {
  albums: [
    {
      id: 1,
      users_id: 1,
      name: 'Foo Bar',
      images: [
        { url: 'example.com/image.jpg' },
        { url: 'example.com/image.jpg' }
      ]
    },
    {
      id: 2,
      users_id: 2,
      name: 'Bar Baz',
      images: [
        { url: 'example.com/image.jpg' },
        { url: 'example.com/image.jpg' },
        { url: 'example.com/image.jpg' }
      ]
    }
  ],
  users: [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' }
  ]
}

test('Data normalizer', t => {
  const db = new Database('feryardiant', 'apify', 'albums')

  db.rawData = rawData

  db.normalize()

  t.is(db.tables.length, 3, 'Should resulting 3 tables')
  t.ok(db.tables.includes('images'), 'Should have `images` table as results')
  t.is(db.rows.images.length, 5, 'Should collect all rows from related')
  t.ok(db.rows.images.every(i => i.albums_id ), 'Should has parent column on generated table')
  t.notOk(db.model.rows.every(i => i.images ), 'Images fields shouldnt exists in parent table')

  t.end()
})
