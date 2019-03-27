const listen = require('test-listen')
const axios = require('axios')

const apify = require('../index')
const validStatus = [200, 201, 204, 304]

const axiosOption = {
  headers: {
    commons: {
      'Content-Type': 'application/json'
    }
  },
  validateStatus (status) {
    return validStatus.includes(status)
  }
}

exports.request = axios.create(axiosOption)

exports.start = (test) => {
  const service = require('micro')(apify)

  test.onFinish(() => {
    service.close()
  })

  return listen(service)
}

exports.validStatus = validStatus
