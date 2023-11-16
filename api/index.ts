import { writeFile } from 'fs/promises'
import { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import { isObject, isNumber, loadCache } from '../utils/index.js'

const allowedMethods = ['POST', 'GET', 'PUT', 'OPTIONS', 'DELETE']
const allowedTypes = [
  'application/x-www-form-urlencoded',
  'application/json'
]

function allowedMethodsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Max-Age', '86400')
  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '))
  res.setHeader('Allow', allowedMethods.join(', '))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', req.headers['origin'] || '*')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Authorization, Access-Control-Allow-Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Accept-Charset', 'utf-8')
  res.setHeader('Vary', 'Origin')

  if (!allowedMethods.includes(req.method)) {
    allowedMethodsHeaders(res)

    return res.status(405).json({ message: 'Method not allowed' })
  }

  if (req.method === 'OPTIONS') {
    allowedMethodsHeaders(res)

    return res.status(204)
  }

  const requestType = req.headers['content-type']
  if (req.body && !allowedTypes.includes(requestType)) {
    return res.status(405).json({
      message: `Invalid request content-type: ${requestType}`
    })
  }

  const segments = req.url.slice(1).split('/')

  if (segments.length < 2) {
    return res.status(405).json({
      message: `Invalid request path, expected: /:user/:repo/:table?`
    })
  }

  const data = {}
  const [user, repo] = segments
  const table = segments[2] || null

  try {
    const content = await fetch(user, repo)
    const resources = Object.keys(content)
    const stats = {}

    for (const resource of resources) {
      data[resource] = createRepository(resource, content[resource], data)
    }

    for (const [key, value] of Object.entries<Repository>(data)) {
      stats[key] = {
        primary: value.primary,
        numRows: value.data.length,
        attribute: value.attribute
      }
    }

    res.status(200).json({
      data: table === null ? stats : data[table]
    })
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const { status, data } = err.response

      return res.status(status).json(data)
    }

    res.status(500).json({ message: err.message })
  }
}

function createRepository (table: string, entries: any[], data: object = {}) {
  const repo: Repository = data[table] || new Repository(table)

  if (entries.length > 0) {
    if (!(repo.primary in repo.attribute)) {
      entries = entries.map((entry, i) => {
        return {
          [repo.primary]: ++i,
          ...entry
        }
      })
    }

    repo.insertData(entries)
  }

  for (const relation of repo.relations) {
    if (!repo.attribute[relation]) {
      continue
    }

    const relate = repo.attribute[relation].related
    const relations = []

    for (const related of repo.data) {
      if (Array.isArray(related[relation])) {
        relations.push(...related[relation])
        continue
      }

      if (!isObject(related[relation])) {
        continue
      }

      relations.push(related[relation])
    }

    const rel = createRepository(relate, relations, data)

    if (!rel.relations.includes(table)) {
      rel.relations.push(table)
    }

    data[relate] = rel
  }

  return repo
}

async function fetch (user: string, repo: string) {
  let { filepath, content } = await loadCache(user, repo)

  if (content === null) {
    const { data } = await axios.get(`/${user}/${repo}/contents/.apify.json`, {
      baseURL: 'https://api.github.com/repos'
    })

    content = JSON.parse(
      Buffer.from(data.content, data.encoding).toString()
    )

    await writeFile(filepath, JSON.stringify(content))
  }

  return content
}

type Attribute = {
  type: string
  related?: string
}

class Repository {
  attribute: object = {}
  data: object[] = []
  primary: string = 'id'
  relations: string[] = []

  constructor(
    readonly table: string,
    rawData: any[] = [],
    primary: string = 'id'
  ) {
    if (rawData.length > 0) {
      this.insertData(rawData, primary)
    }
  }

  insertData(rawData: any[] = [], primary: string = 'id') {
    for (const [field, value] of Object.entries<any>(rawData[0])) {
      const isArray = Array.isArray(value)
      const attr: Attribute = {
        type: typeof value
      }

      if ([primary].includes(field)) {
        this.primary = field
      }

      if (/_at$/.test(field)) {
        attr.type = 'timestamp'
      } else if (isNumber(value)) {
        attr.type = 'number'
      }

      if (isArray || isObject(value)) {
        attr.type = 'relation'
        attr.related = field
        this.relations.push(field)
      } else if (/_id$/.test(field)) {
        attr.type = 'relation'
        attr.related = field.replace(/_id$/, '')
        this.relations.push(field)
      }

      this.attribute[field] = attr
    }

    this.data = rawData
  }

  isEmpty() {
    return this.data.length === 0
  }
}
