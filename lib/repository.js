/**
 * @typedef RepositoryAttribute
 * @type {Object}
 * @property {String} key
 * @property {String} label
 * @property {Boolean} sortable
 * @property {Boolean} visible
 * @property {String} type
 */

/**
 * @typedef RepositoryRelation
 * @type {Object}
 * @property {String} related
 * @property {!String} child
 * @property {!String} parent
 */

/**
 * @class Repository
 * @property {Boolean} update_timestamp
 * @property {Boolean} create_timestamp
 * @property {Boolean} soft_deletes
 * @property {Boolean} timestamps
 */
class Repository {
  /**
   * Creates an instance of Repository.
   *
   * @memberof Repository
   * @param {Object} repo
   * @param {Array} repo.data
   * @param {String} repo.table
   * @param {String} repo.primary
   * @param {Object.<String, RepositoryAttribute>} repo.attributes
   * @param {Array.<RepositoryRelation>} repo.relations
   */
  constructor (repo) {
    this.data = repo.data
    this.table = repo.table
    this.primary = repo.primary
    this.attributes = repo.attributes
    this.relations = repo.relations
  }
}

module.exports = Repository
