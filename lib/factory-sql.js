
const R = require('ramda');

// SEPARATOR :: String
const SEPARATOR = ' \n';

/**
 * type alias TableName = String
 * type aliase Clause   = String
 * type alias SQL       = String
 *
 * type alias ClauseDict =
 *      { select = Clause
 *      , from   = Clause
 *      , join   = Clause
 *      , where  = Clause
 *      , order  = Clause
 *      , group  = Clause
 *      }
 *
 * type alias BaseDict = ClauseDict
 * type alias UserDict = ClauseDict
 */

// getLastParam :: a, b -> b
const getLastParam = R.unapply(R.last);


// getDefaultClauseDict :: TableName -> ClauseDict
const getDefaultClauseDict = (table) => ({
  select : `SELECT \`${table}\`.*`
, from   : `FROM \`${table}\``
, join   : ''
, where  : 'WHERE 1'
, order  : ''
, group  : ''
});


// getBaseClauseDict :: TableName -> ClauseDict -> BaseDict
const getBaseClauseDict = R.converge(R.merge, [
  getDefaultClauseDict
, getLastParam
]);


const mergeClause = (fn) => R.curry((user, base)  => {
  if (user.length > 0) {

    if (base.length > 0) {
      return fn(user, base);
    }
    
    return user;
  }
  return base;
});


// mergeWithComma :: Clause -> Clause -> SQL
const mergeWithComma = mergeClause((user, base) => `${base}\n,${user}`);


// mergeWithNewLine :: Clause -> Clause -> SQL
const mergeWithNewLine = mergeClause((user, base) => `${base}\n${user}`);


// MergeFactory :: UserDict -> (BaseDict -> ClauseDict)
const MergeFactory = R.compose(
  R.evolve
, R.applySpec({
    select: R.compose(mergeWithComma, R.propOr('', 'select'))
  , from: R.always(R.identity)
  , join: R.compose(mergeWithNewLine, R.propOr('', 'join'))
  , where: R.compose(mergeWithNewLine, R.propOr('', 'where'))
  , order: R.compose(mergeWithComma, R.propOr('', 'order'))
  , group: R.compose(mergeWithComma, R.propOr('', 'group'))
 })
);


// assemble :: ClauseDict -> SQL
const assemble = ({ select, from, join, where, order, group }) =>
  select + SEPARATOR +
  from + SEPARATOR +
  join + SEPARATOR +
  where + SEPARATOR +
  order + SEPARATOR +
  group
;


// Factory :: BaseDict -> UserDict -> SQL
const Factory = (base) => (user) => {
  const merge_fn    = MergeFactory( R.defaultTo({}, user) );
  const merged_dict = merge_fn(base);

  return assemble(merged_dict);
};


// FactoryFactory :: TableName -> BaseDict -> (UserDict -> SQL)
const FactoryFactory = (table, clause_dict) => {
  if (!table) {
    throw new TypeError('You must provide the table <string> parameter.');
  }

  //@TODO - add props check to validate the given SQL clauses object.

  const base_dict = getBaseClauseDict(table, clause_dict);
  // factory :: ClauseDict -> SQL
  const factory   = Factory(base_dict);
  factory.table   = table;

  return factory;
};


module.exports = FactoryFactory;
  
