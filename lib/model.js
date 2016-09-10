
const R          = require('ramda');
const Bluebird   = require('bluebird');
const query      = require('./query');
const Search     = require('./search');

const NO_CACHE = 1;


const interceptNoOp = () => R.identity;


const getIntercept = R.propOr(interceptNoOp);


const getErrorHandler = R.propOr((e) => { throw e; }, 'errorHandler');


const getById = R.curry((sql_factory, conn, id) => {
  const sql = sql_factory({
    where: ` AND \`${sql_factory.table}\`.\`id\` = ? `
  });

  return query.getOneById(conn, sql, id);
});


const get = R.curry((sql_factory, clauses, conn, params, no_cache = false) =>
  query.select(conn, sql_factory(clauses), params, no_cache)
);


const getOne = R.curry(
  (sql_factory, clauses, conn, params, no_cache = false) =>
    query.getOne(conn, sql_factory(clauses), params, no_cache)
);


const getWhere = R.curry(
  (sql_factory, where, conn, params, no_cache = false) =>
    get(sql_factory, { where: where }, conn, params, no_cache)
);


const getWhereNoCache = R.curry((sql_factory, where, conn, params) =>
  getWhere(sql_factory, where, conn, params, NO_CACHE)
);


const getOneWhere = R.curry(
  (sql_factory, where, conn, params, no_cache = false) =>
    getOne(sql_factory, { where: where }, conn, params, no_cache)
);


const getOneWhereNoCache = R.curry((sql_factory, where, conn, params) =>
  getOneWhere(sql_factory, where, conn, params, NO_CACHE)
);


const incrementField = R.curry((sql_factory, field, conn, id) =>
  query.incrementField(field, conn, sql_factory.table, id)
);


const softDelete = R.curry((intercepts, sql_factory, conn, id) => {
  const _delete = intercepts.compound ?
    query.softCompoundDelete :
    query.softDelete;

  const preDelete  = getIntercept('preDelete', intercepts);
  const postDelete = getIntercept('postDelete', intercepts);
  const _error     = getErrorHandler(intercepts);

  return Bluebird.resolve(id)

  .then(preDelete(sql_factory.table, conn))

  .then(_delete(conn, sql_factory.table))

  .then(postDelete(sql_factory.table, conn))

  .return(id)

  .catch(_error)

});


const deactivate = R.curry((intercepts, sql_factory, conn, id) => {

  const preDeactivate  = getIntercept('preDeactivate', intercepts);
  const postDeactivate = getIntercept('postDeactivate', intercepts);
  const _error         = getErrorHandler(intercepts);

  return Bluebird.resolve(id)

  .tap(preDeactivate(sql_factory.table, conn))

  .then(query.deactivate(conn, sql_factory.table))

  .tap(postDeactivate(sql_factory.table, conn))

  .return(id)

  .catch(_error)

});


const update = R.curry((intercepts, sql_factory, conn, current, request) => {
  
  const _update    = query.update(conn, sql_factory.table, R.__, current.id);
  const preUpdate  = getIntercept('preUpdate', intercepts);
  const postUpdate = getIntercept('postUpdate', intercepts);

  return Bluebird.resolve(request)

  .then(preUpdate(sql_factory, conn, current))

  .then(_update)

  .then(postUpdate(sql_factory, conn, current))

});


const insert = R.curry((intercepts, sql_factory, conn, request) => {

  const _insert    = query.insert(conn, sql_factory.table);
  const preInsert  = getIntercept('preInsert', intercepts);
  const postInsert = getIntercept('postInsert', intercepts);

  return Bluebird.resolve(request)

  .then(preInsert(sql_factory, conn))

  .then(_insert)

  .then(postInsert(sql_factory, conn))

});


const save = R.curry(
  (intercepts, sql_factory, conn, request, current = null) => {
    const method = current ? update : insert;
    const _save  = method(intercepts, sql_factory, conn)

    const preSave  = getIntercept('preSave', intercepts);
    const postSave = getIntercept('postSave', intercepts);
    const _error   = getErrorHandler(intercepts);

    const retrieve = (id) => getById(sql_factory, conn, id, NO_CACHE);

    return Bluebird.resolve(request)

    .then(preSave(sql_factory, conn, current))

    .then(_save)

    .then(retrieve)

    .then(postSave(sql_factory, conn, current))

    .catch(_error)
  }
);

const search = R.curry((sql_factory, map, conn, params) => {

  params = Search.parseParams(map)(params)

  const _params = Search.normalizeParams(map)(params)

  const clauses = Search.getClauses(map, _params)

  let sql = sql_factory(clauses)
  sql = query.interpolate(conn)(sql)(_params)

  const sql_paginated = Search.addPagination(conn, sql, _params)
  const sql_count = Search.getCountSql(sql)

  return Bluebird.props({
    params: params,
    count : query.select(conn, sql_count, [], false).get(0).get('count'),
    rows  : query.select(conn, sql_paginated, [], false)
  })

})

module.exports = {
  getById
, get
, getWhere
, getWhereNoCache
, getOneWhere
, getOneWhereNoCache
, incrementField
, deactivate
, softDelete
, save
, search
}
