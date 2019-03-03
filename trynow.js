/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
module.exports = async (req, res) => {
  const paths = req.url.slice(1).split('/').filter(p => p)

  res.end(JSON.stringify({paths}))
}
