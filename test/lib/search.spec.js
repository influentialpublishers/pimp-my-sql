const R           = require('ramda');
const { expect }  = require('chai');
const { inspect } = require('util');
const sinon       = require('sinon');
const Search = require('../../lib/search.js')


describe('lib/search.js', () => {

  describe('::parseParams', () => {

    it('should return default pagination params', (done) => {

      const test = {
        page: undefined,
        limit: undefined
      }

      const results = Search.parseParams({})(test)

      const expected = {
        offset: 0,
        limit: 16,
        page: 1
      }

      expect(results).to.eql(expected)

      done()

    })

    it('should return offset of 24', (done) => {

      const test = {
        page: 3,
        limit: 12
      }

      const results = Search.parseParams({})(test)

      const expected = {
        offset: 24,
        limit: 12,
        page: 3
      }

      expect(results).to.eql(expected)

      done()

    })

    it('should not return starts_with param', (done) => {

      const test = {
        starts_with: 'asdf'
      }

      const map = {}

      const results = Search.parseParams(map)(test)

      const expected = {
        offset: 0,
        limit: 16,
        page: 1
      }

      expect(results).to.eql(expected)

      done()

    })

    it('should return starts_with param', (done) => {

      const test = {
        starts_with: 'asdf'
      }

      const map = {
        starts_with: () => ({
          validation: []
        })
      }

      const results = Search.parseParams(map)(test)

      const expected = {
        offset: 0,
        limit: 16,
        page: 1,
        starts_with: 'asdf'
      }

      expect(results).to.eql(expected)

      done()

    })

    it('should return with normalized starts_with param', (done) => {

      const test = {
        starts_with: 'asdf'
      }

      const map = {
        starts_with: () => ({
          validation: [],
          normalize: R.toUpper
        })
      }

      const results = Search.parseParams(map)(test)

      const expected = {
        offset: 0,
        limit: 16,
        page: 1,
        starts_with: 'ASDF'
      }

      expect(results).to.eql(expected)

      done()

    })

  })


  describe('::addPagination', (done) => {

    it('should interpolate limit clause', (done) => {

      db = {
        escape: R.identity
      }

      params = {
        offset: 24,
        limit: 12,
        page: 1
      }

      expected = 'QUERY LIMIT 24, 12'

      const results = Search.addPagination(db, 'QUERY', params)

      expect(results).to.eql(expected)

      done()
    })

  })


  describe('::getClauses', (done) => {

    it('should return clauses', (done) => {

      const map = {
        starts_with: () => ({
          normalize: R.identity,
          select: '`starts` FROM `start`',
          join: 'JOIN `start` ON `start`.`id` IS NOT NULL',
          where: ' AND `start`.`deleted` IS NULL'
        }),
        ends_with: () => ({
          normalize: R.identity,
          select: '`ends` FROM `ending`',
          join: 'JOIN `ending` ON `ending`.`id` IS NOT NULL',
          where: ' AND `ending`.`deleted` IS NULL'
        })
      }

      const params = {
        'starts_with': 'asdf'
      }

      const expected = {
        select: '`starts` FROM `start`',
        join: 'JOIN `start` ON `start`.`id` IS NOT NULL',
        where: ' AND `start`.`deleted` IS NULL'
      }

      const results = Search.getClauses(map, params)

      expect(results).to.eql(expected)

      done()

    })

    it('should merge clauses', (done) => {

      const map = {
        starts_with: () => ({
          normalize: R.identity,
          select: 'SELECT `starts` FROM `start`',
          join: 'JOIN `start` ON `start`.`id` IS NOT NULL',
          where: ' AND `start`.`deleted` IS NULL'
        }),
        ends_with: () => ({
          normalize: R.identity,
          select: '`ends` FROM `ending`',
          join: 'JOIN `ending` ON `ending`.`id` IS NOT NULL',
          where: 'AND `ending`.`deleted` IS NULL'
        })
      }

      const params = {
        'starts_with': 'asdf',
        'ends_with': 'qwer'
      }

      const expected = {
        select: 'SELECT `starts` FROM `start`, `ends` FROM `ending`',
        join: 'JOIN `start` ON `start`.`id` IS NOT NULL JOIN `ending` ON `ending`.`id` IS NOT NULL',
        where: ' AND `start`.`deleted` IS NULL AND `ending`.`deleted` IS NULL'
      }

      const results = Search.getClauses(map, params)

      expect(results).to.eql(expected)

      done()

    })

    it('should merge clauses and remove duplicate join', (done) => {

      const map = {
        starts_with: () => ({
          normalize: R.identity,
          select: 'SELECT `starts` FROM `start`',
          join: 'JOIN `start` ON `start`.`id` IS NOT NULL',
          where: ' AND `start`.`deleted` IS NULL'
        }),
        ends_with: () => ({
          normalize: R.identity,
          select: '`ends` FROM `ending`',
          join: 'JOIN `start` ON `start`.`id` IS NOT NULL',
          where: 'AND `ending`.`deleted` IS NULL'
        })
      }

      const params = {
        'starts_with': 'asdf',
        'ends_with': 'qwer'
      }

      const expected = {
        select: 'SELECT `starts` FROM `start`, `ends` FROM `ending`',
        join: 'JOIN `start` ON `start`.`id` IS NOT NULL',
        where: ' AND `start`.`deleted` IS NULL AND `ending`.`deleted` IS NULL'
      }

      const results = Search.getClauses(map, params)

      expect(results).to.eql(expected)

      done()

    })

  })

  describe('::getCountSql', (done) => {

    it('should build a query to grab the count', (done) => {

      const sql = 'Query'

      const expected = `
    SELECT COUNT(*) AS \`count\`
    FROM (Query) AS \`temp\`
`

      const results = Search.getCountSql(sql)

      expect(results).to.eql(expected)

      done()
    })

  })


})