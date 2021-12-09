import { readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { resolve } from 'path'

/**
 * Promisify
 */
export const promisify = (cb: Function) => {
  return new Promise((resolve, reject) => {
    cb((err: Error | null, data: any) => {
      if (err) return reject(err)
      return resolve(data)
    })
  })
}

/**
 * Determine is value a plain object.
 */
export const isObject = (value: any) => {
  return value !== null && value.constructor.name === 'Object'
}

/**
 * Determine is value a number-ish.
 */
export const isNumber = (value: any) => {
  return typeof value === 'number' ||
    (typeof value === 'string' && /^-?(\d)+$/.test(value))
}

export const capitalize = (words: string) => {
  if (words === 'id') return 'ID'

  return words.toLowerCase()
    .replace(/_(id|at)$/, '')
    .replace(/(_|\-)/g, ' ')
    .replace(/[^\s]*/g, word => {
      return word.replace(/./, ch => ch.toUpperCase())
    })
}

export const loadCache = async (user: string, repo: string) => {
  const filename = `${user}-${repo}.apify.json`
  const filepath = resolve(tmpdir(), filename)

  try {
    const cache = await readFile(filepath)

    return {
      filepath,
      content: JSON.parse(cache.toString())
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        filepath,
        content: null
      }
    }

    throw err
  }
}
