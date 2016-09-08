const R = require('ramda')
const Query = require('./query.js')

const PAGINATION_PARAMS = [
  'page',
  'limit'
]

const DEFAULT_PAGINATION_PARAMS = {
  page: 1,
  limit: 16
}

const PAGINATION_LIMIT_CLAUSE = ' LIMIT :offset, :limit'

const REGEX_JOIN = /((?:LEFT|RIGHT|INNER|OUTER|CROSS)? ?JOIN +`?(.+?)`? *(?: +AS +`?(.+?)`?)? +ON .+?) ?(?=LEFT|RIGHT|INNER|OUTER|CROSS|JOIN|\n|$)/i

const CLAUSES = [
  'select',
  'join',
  'where',
  'order'
]

const CLAUSE_DELIMITER = {
  select: ', '
}

// parseParams:: Object -> Object -> Object
parseParams = (map) => R.compose(
  R.converge(
    R.merge,
    [
      _parseSearchParams(map),
      _parsePaginationParams
    ]
  ),
  _normalizeParams(map),
  _sanitizeParams
)

// _sanitizeParamss:: Object -> Object
_sanitizeParams = R.pickBy(R.compose(R.not,R.isNil))

// _normalizeParams:: Object -> Object - Object
_normalizeParams = (map) => R.mapObjIndexed(
  (val, key) => {

    let _normalize = R.identity

    if(typeof(map[key]) == 'function')
      _normalize = R.propOr(_normalize, 'normalize', map[key](val))

    return _normalize(val)
  }
)


// _parseSearchParams:: Object -> Object -> Object
_parseSearchParams = (map) => R.compose(
  R.pick(R.keys(map)),
  R.without(PAGINATION_PARAMS)
)


// _parsePaginationParams:: Object -> Object
_parsePaginationParams = R.compose(
  (params) => ({
    offset: (parseInt(params.page) - 1) * parseInt(params.limit),
    limit : parseInt(params.limit),
    page : parseInt(params.page)
  }),
  R.pick(PAGINATION_PARAMS),
  R.merge(DEFAULT_PAGINATION_PARAMS)
)


// addPagination:: MySqlConnection, String, Object -> String
addPagination = R.curry((db, sql, params) => {
  return R.compose(
    R.concat(sql),
    Query.interpolate(db)(PAGINATION_LIMIT_CLAUSE)
  )(params)
})


// concatClause:: String, String, String -> String
const _concatClause = (key, left, right) => {

  const delimiter = R.defaultTo(' ', CLAUSE_DELIMITER[key])

  return R.join(delimiter, [left, right])
}

// getClauses:: Object -> Object -> Object
const getClauses = (map, params) => {

  const _keys = R.compose(
    R.keys,
    R.without(['page','limit'])
  )(params)

  const _resolveClause = (params) => (fn, key) => {return fn(params[key])}

  const _mergeClauses = (aggregate, clauses) => {
    const _clauses = R.pick(CLAUSES, clauses)
    return R.mergeWithKey(_concatClause, aggregate, _clauses)
  }

  return R.compose(
    _sanitizeJoins,
    R.reduce(_mergeClauses, {}),
    R.values,
    R.mapObjIndexed(_resolveClause(params)),
    R.pick(_keys)
  )(map)
}


// getCountSql:: String -> String
const getCountSql = (sql) => {
  return `
    SELECT COUNT(*) AS \`count\`
    FROM (${ sql }) AS \`temp\`
`
}


// _getJoins:: String -> Array
const _getJoins = (input) => {

  let matches, output = []

  let index = 0

  matches = REGEX_JOIN.exec(input)

  while(matches) {
    var [match, table, alias] = matches

    output.push({
      alias: R.defaultTo(table, alias),
      match: match,
      index: matches.index + index
    })

    input = R.slice(matches.index+match.length, Infinity, matches.input)
    index += matches.index+match.length

    matches = REGEX_JOIN.exec(input)
  }

  return output

}


// _sanitizeJoins:: String -> Array -> String
const _sanitizeJoins = (clauses) => {

  let join_clause = clauses.join

  let joins = _getJoins(join_clause)

  if(R.isNil(join_clause))
    return ''

  return R.compose(
    R.merge(clauses),
    R.objOf('join'),
    R.reduce((c,n) => {
      return R.join('', R.remove(n.index, n.match.length, c))
    }, join_clause),
    R.sortBy(R.compose(R.negate, R.prop('index'))),
    R.flatten,
    R.map(R.tail),
    R.values,
    R.groupBy(R.prop('alias'))
  )(joins)

}

module.exports = {
  parseParams: parseParams,
  addPagination: addPagination,
  getClauses: getClauses,
  getCountSql: getCountSql
}