
const R = require('ramda');


const initClauses = (table, { select, join, where, order, group}) => ({
  select : select || `SELECT *`
, from   : ` FROM \`${table}\` `
, join   : join || ' '
, where  : where || ` WHERE 1 `
, order  : order || ' '
, group  : group || ' '
});


const mergeSelect = R.curry((base_select, user_select) =>
  `${base_select}\n, ${user_select} `);


const mergeClause = R.curry((base, user) => `${base} \n ${user} `);


const mergeClauses = R.curry((base_clauses, user_clauses) => R.evolve({
  select: mergeSelect(user_clauses.select || '')
, from: R.identity
, join: mergeClause(user_clauses.join || '')
, where: mergeClause(user_clauses.where || '')
, order: mergeClause(user_clauses.order || '')
, group: mergeClause(user_clauses.group || '')
})(base_clauses));


const assemble = ({ select, from, join, where, order, group }) => `
  ${select}
  ${from}
  ${join}
  ${where}
  ${order}
  ${group}
`;


const FactoryFactory = (table, clauses) => {

  const base_clauses = initClauses(table, clauses);

  const factory = R.compose(
    assemble
  , mergeClauses(base_clauses)
  );
  factory.table = table;

  return factory;
};


module.exports = FactoryFactory;
  
