const faker = require('faker')
const fs = require('fs')

const faked = {
  albums: [],
  people: [],
  posts: [],
  products: [],
  users: [],
}

let created
const now = new Date()
const users = []

for (let i = 1; i <= 50; i++) {
  created = faker.date.past()
  users.push(i)
  faked.users.push({
    id: i,
    username: faker.internet.userName(),
    email: faker.internet.exampleEmail().toLowerCase(),
    avatar: faker.internet.avatar(),
    deleted_at: null,
    created_at: created,
    active_at: created,
    updated_at: faker.date.between(created, now),
  })
}

const albumTags = ['business', 'animals', 'city', 'food', 'nature']

for (let i = 1; i <= 100; i++) {
  created = faker.date.past()
  const updated = faker.date.between(created, now)
  const tag = faker.random.arrayElement(albumTags)
  const images = []
  const length = [6, 9, 12, 15]

  for (let n = 1; n <= faker.random.arrayElement(length); n++) {
    images.push({
      image: faker.image[tag]()
    })
  }

  faked.albums.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    thumbnail: faker.image[tag](400, 400),
    images: images,
    tag: tag,
    deleted_at: null,
    created_at: created,
    updated_at: updated,
  })
}

const companies = []

for (let i = 1; i <= 20; i++) {
  companies.push({
    name: faker.company.companyName(),
    address: faker.address.streetAddress(),
    phone: faker.phone.phoneNumber('(###) ###-####'),
    email: faker.internet.exampleEmail().toLowerCase()
  })
}

for (let i = 1; i <= 60; i++) {
  created = faker.date.past()
  faked.people.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    name: faker.name.findName(),
    address: faker.address.streetAddress(),
    phone: faker.phone.phoneNumber('(###) ###-####'),
    email: faker.internet.exampleEmail().toLowerCase(),
    company: faker.random.arrayElement(companies),
    deleted_at: null,
    created_at: created,
    updated_at: faker.date.between(created, now),
  })
}

for (let i = 1; i <= 100; i++) {
  created = faker.date.past()
  const title = faker.lorem.words(6)
  faked.posts.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    title: title,
    slug: faker.helpers.slugify(title),
    contents: faker.lorem.paragraphs(),
    thumbnail: faker.image.imageUrl(400, 400),
    deleted_at: null,
    created_at: created,
    updated_at: faker.date.between(created, now),
  })
}

for (let i = 1; i <= 100; i++) {
  created = faker.date.past()
  faked.products.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    name: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price(100, 500)),
    thumbnail: faker.image.imageUrl(400, 400),
    deleted_at: null,
    created_at: created,
    updated_at: faker.date.between(created, now),
  })
}

fs.writeFileSync('db.json', JSON.stringify(faked, null, 2))
