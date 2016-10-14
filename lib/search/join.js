const R = require('ramda')

const REGEX_JOIN = /((?:LEFT|RIGHT|INNER|OUTER|CROSS)? ?JOIN +[`"]?(.+?)[`"]? *(?: +AS +[`"]?(.+?)[`"]?)? +ON .+?) ?(?=LEFT|RIGHT|INNER|OUTER|CROSS|JOIN|\n|$)/i

const REGEX_MATCH_INDEX = 1
const REGEX_TABLE_INDEX = 2
const REGEX_ALIAS_INDEX = 3

// _getJoins:: String -> Array
const _getJoins = (input) => {

  let matches, output = []
  let index = 0

  // Find all join statements in string; capture table/alias
  matches = REGEX_JOIN.exec(input)

  while(matches) {
    const match = matches[REGEX_MATCH_INDEX]
    const table = matches[REGEX_TABLE_INDEX]
    const alias = matches[REGEX_ALIAS_INDEX]

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

// _getDuplicatesByAlias:: String -> [String]
const _getDuplicatesByAlias = R.compose(
  R.flatten,
  R.map(R.tail),
  R.values,
  R.groupBy(R.prop('alias'))
)

// _removeDuplicates:: String, [String] -> String
const _removeDuplicates = (join_clause) => R.compose(

  R.reduce((c,n) => {
    return R.join('', R.remove(n.index, n.match.length, c))
  }, join_clause),

  R.sortBy(R.compose(R.negate, R.prop('index')))

)

// sanitizeJoins:: String -> Array -> String
const sanitizeJoins = (clauses) => {

  let join_clause = clauses.join

  // Return empty string if null/undefined
  if(R.isNil(join_clause))
    return clauses

  return R.compose(
    R.merge(clauses),
    R.objOf('join'),
    _removeDuplicates(join_clause),
    _getDuplicatesByAlias,
    _getJoins
  )(join_clause)

}

module.exports = {
  sanitizeJoins: sanitizeJoins
}
