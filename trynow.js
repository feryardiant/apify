module.exports = async (req, res) => {
  const paths = req.url.split('/')

  return { paths }
}
