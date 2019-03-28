const listen = require('test-listen')
const axios = require('axios')

const apify = require('../index')
const validStatus = [200, 201, 204, 304]

const axiosOption = {
  headers: {
    common: {
      'Content-Type': 'application/json'
    }
  },
  validateStatus (status) {
    return validStatus.includes(status)
  }
}

exports.request = axios.create(axiosOption)

exports.start = async (test, cb) => {
  const service = require('micro')(apify)

  test.onFinish(() => {
    service.close()
  })

  const url = await listen(service)

  if (typeof cb === 'function') {
    return cb(url)
  }

  return url
}

exports.validStatus = validStatus
