import { faker } from '@faker-js/faker'
import fs from 'fs'

const faked = {
  albums: [],
  people: [],
  posts: [],
  products: [],
  users: [],
}

let created: Date
const now = new Date()
const users = []

for (let i = 1; i <= 30; i++) {
  created = faker.date.past()
  users.push(i)
  faked.users.push({
    id: i,
    username: faker.internet.userName(),
    email: faker.internet.exampleEmail().toLowerCase(),
    avatar: faker.image.avatar(),
    deleted_at: null,
    created_at: created,
    active_at: created,
    updated_at: faker.date.between({
      from: created,
      to: now
    }),
  })
}

const albumTags = ['business', 'animals', 'city', 'food', 'nature']

for (let i = 1; i <= 60; i++) {
  created = faker.date.past()
  const updated = faker.date.between({ from: created, to: now })

  const tag = faker.helpers.arrayElement(albumTags)
  const images = []
  const length = [6, 9, 12, 15]

  for (let n = 1; n <= faker.helpers.arrayElement(length); n++) {
    images.push({
      image: faker.image[tag]()
    })
  }

  faked.albums.push({
    id: i,
    users_id: faker.helpers.arrayElement(users),
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
    name: faker.company.name(),
    address: faker.location.streetAddress(),
    phone: faker.phone.number({ style: 'national' }),
    email: faker.internet.exampleEmail().toLowerCase()
  })
}

for (let i = 1; i <= 40; i++) {
  created = faker.date.past()
  faked.people.push({
    id: i,
    users_id: faker.helpers.arrayElement(users),
    name: faker.person.fullName(),
    address: faker.location.streetAddress(),
    phone: faker.phone.number({ style: 'national' }),
    email: faker.internet.exampleEmail().toLowerCase(),
    company: faker.helpers.arrayElement(companies),
    deleted_at: null,
    created_at: created,
    updated_at: faker.date.between({ from: created, to: now }),
  })
}

for (let i = 1; i <= 60; i++) {
  created = faker.date.past()
  const title = faker.lorem.words(6)
  faked.posts.push({
    id: i,
    users_id: faker.helpers.arrayElement(users),
    title: title,
    slug: faker.helpers.slugify(title),
    contents: faker.lorem.paragraphs(),
    thumbnail: faker.image.url({ width: 400, height: 400 }),
    deleted_at: null,
    created_at: created,
    updated_at: faker.date.between({ from: created, to: now }),
  })
}

for (let i = 1; i <= 60; i++) {
  created = faker.date.past()
  faked.products.push({
    id: i,
    users_id: faker.helpers.arrayElement(users),
    name: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price({ min: 100, max: 500 })),
    thumbnail: faker.image.url({ width: 400, height: 400 }),
    deleted_at: null,
    created_at: created,
    updated_at: faker.date.between({ from: created, to: now }),
  })
}

fs.writeFileSync('.apify.json', JSON.stringify(faked, null, 2))
