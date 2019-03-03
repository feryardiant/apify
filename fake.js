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
    email: faker.internet.exampleEmail(),
    avatar: faker.internet.avatar(),
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
  const length = [15, 20, 25, 30, 35, 40]

  for (let n = 1; n <= faker.random.arrayElement(length); n++) {
    images.push({
      album_id: i,
      image: faker.image[tag](),
      tag: tag,
      created_at: updated,
      updated_at: updated
    })
  }

  faked.albums.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    images: images,
    tag: tag,
    created_at: created,
    updated_at: updated,
  })
}

const companies = []

for (let i = 1; i <= 20; i++) {
  companies.push({
    name: faker.company.companyName(),
    address: faker.address.streetAddress(),
    phone: faker.phone.phoneNumber(),
    email: faker.internet.exampleEmail()
  })
}

for (let i = 1; i <= 60; i++) {
  created = faker.date.past()
  faked.people.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    name: faker.name.findName(),
    address: faker.address.streetAddress(),
    phone: faker.phone.phoneNumber(),
    email: faker.internet.exampleEmail(),
    company: faker.random.arrayElement(companies),
    created_at: created,
    updated_at: faker.date.between(created, now),
  })
}

for (let i = 1; i <= 100; i++) {
  created = faker.date.past()
  faked.posts.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    title: faker.lorem.words(6),
    slug: faker.lorem.slug(6),
    contents: faker.lorem.paragraphs(),
    thumbnail: faker.image.imageUrl(),
    created_at: created,
    updated_at: faker.date.between(created, now),
  })
}

for (let i = 1; i <= 100; i++) {
  created = faker.date.past()
  faked.products.push({
    id: i,
    user_id: faker.random.arrayElement(users),
    name: faker.commerce.product(),
    price: faker.commerce.price(),
    thumbnail: faker.image.imageUrl(),
    created_at: created,
    updated_at: faker.date.between(created, now),
  })
}

fs.writeFileSync('db.json', JSON.stringify(faked, null, 2))
