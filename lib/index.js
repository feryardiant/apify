const { parseParam } = require('./params')
const { normalize } = require('./normalizer')

exports = {
  Resource: require('./resource'),
  normalize,
  parseParam
}
