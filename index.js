
const _                = require('ramda');
const moment           = require('moment');
const Bluebird         = require('bluebird');
const { randomBytes }  = require('crypto');
const { inspect }      = require('util');


const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';


const bindError = _.curry((fn, sql, params) => fn.bind(null, sql, params));


const idMatch = _.curry((id, possibleId) => id + '' === possibleId + '');


const dateIsUnix = _.compose(_.equals(0), _.modulo(_.__, 1));


const momentFromString = (date) => moment(new Date(date));


const momentFromDate = _.cond([
  [ _.isNil,         moment ]
, [ moment.isMoment, _.identity ]
, [ dateIsUnix,      moment.unix ]
, [ _.T,             momentFromString ]
]);


const throwInsertFailedError = (sql, params) => {
  const param_string = inspect(params);
  throw new Error(`Insert Failed:\nSQL: ${sql}\nPARAMS: ${param_string}`);
};


const throwNotFoundError = _.curry((sql, params) => {
  const param_string = inspect(params);
  throw new Error(`Not Found: \nSQL: ${sql}\nPARAMS: ${param_string}`);
});


const query = _.curry((db, sql, params) => new Bluebird((resolve, reject) => {

  db.query(sql, params, (err, results) => {

    if (err) return reject(err);

    return resolve(results);

  });

}));


const cacheBust = (sql) => {
  const random = randomBytes(8).toString('hex') + (new Date()).getTime();
  return `${sql} -- ${random}`;
};


const queryNoCache = _.curry((db, sql, params) => {
  return query(db, cacheBust(sql), params);
});


const rawInsert = _.curry((db, sql, params) => {

  return queryNoCache(db, sql, params)

  .then(_.ifElse(
    _.compose(_.propOr(null, 'insertId'))

  , _.prop('insertId')

  , () => throwInsertFailedError(sql, params)

  ));

});


const rawUpdate = _.curry((db, sql, params) => {

  return queryNoCache(db, sql, params)

  .then(_.propOr(null, 'affectedRows'))

});


const insert = _.curry((db, table, params) => {
  const sql = `INSERT INTO \`${table}\` SET ?`;
  return rawInsert(db, sql, params);
});


const update = _.curry((db, table, params, id) => {

  const sql        = `UPDATE \`${table}\` SET ? WHERE \`${table}\`.\`id\` = ?`;
  const parameters = [ params, id ];

  return rawUpdate(db, sql, parameters);

});


const updateWhere = _.curry((db, table, where, filters, updates) => {

  const sql    = `UPDATE \`${table}\` SET ? WHERE ${where} `;
  const params = [ updates ].concat(filters);

  return rawUpdate(db, sql, params);

});


const incrementField = _.curry((field, db, table, id) => {

  const sql = `
    UPDATE \`${table}\`
    SET \`${field}\` = \`${field}\` + 1
    WHERE \`${table}\`.\`id\` = ?
  `;
  const params = [ id ];

  return query(db, sql, params);

});


const deactivate = _.curry((db, table, id) => {
  const sql = `
    UPDATE \`${table}\`
    SET \`${table}\`.\`active\` = 0
    WHERE \`${table}\`.\`id\` = ?
  `;
  const params = [ id ];

  return query(db, sql, params);

});


const softDelete = _.curry((db, table, id) => {
  const sql = `
    UPDATE \`${table}\`
    SET \`${table}\`.\`deleted\` = CURRENT_TIMESTAMP()
    WHERE \`${table}\`.\`id\` = ?
  `;
  const params = [ id ];

  return query(db, sql, params);

});


const softCompoundDelete = _.curry((db, table, id) => {

  const sql = `
    UPDATE \`${table}\`
    SET
      \`${table}\`.\`deleted\` = 1,
      \`${table}\`.\`deleted_timestamp\` = UNIX_TIMESTAMP()
    WHERE \`${table}\`.\`id\` = ?
  `;
  const params = [ id ];

  return query(db, sql, params);

});


const select = _.curry((db, sql, params, no_cache = false) => {

  const runner    = no_cache ? queryNoCache : query;
  const transform = _.identity

  //@TODO - implement the select transforms.
  /*
  const transform = _.compose(
    NullifyEmpty
  , Nestify
  , JSONParse
  );
  */

  return runner(db, sql, params)

  .map(transform)

});


const getOne = _.curry((db, sql, params, no_cache = false) => {

  const throwError = bindError(throwNotFoundError, sql, params);

  return select(db, sql, params, no_cache)

  .then(_.head)

  .then(_.unless(_.identity, throwError));

});


const getOneById = _.curry((db, sql, id) => {

  const throwError = bindError(throwNotFoundError, sql, id);

  return select(db, sql, [id])

  .tap(_.unless(idMatch(id), throwError));

});


const getTimestamp = (date) => {
  const m = momentFromDate(date);
  return m.format(TIMESTAMP_FORMAT);
};


const interpolate = _.curry((db, sql, params) => {
  if (typeof params !== 'object') {
    throw TypeError('InvalidParameters');
  }

  return sql.resplace(/\:(\w+)/g, (txt, key) => {

    if (params.hasOwnProperty(key)) {
      return db.escape(params[key]);
    }

    return txt;

  });

});


const getWhereParams = _.curry(
  (db, table, params, project = '*', no_cache = false) => {

    const select = `SELECT \`${project}\` FROM \`${table}\` WHERE 1 `;
    const where = _.compose(
      _.join(' ')
    , _.map((key) => ` AND ${key} = :${key} `)
    , _.keys
    )(params);

    const sql = interpolate(db, select + where, params);

    return select(db, sql, params, no_cache);
  
  }
);


module.exports = {
  query
, cacheBust
, rawInsert
, rawUpdate
, insert
, update
, updateWhere
, incrementField
, deactivate
, softDelete
, softCompoundDelete
, select
, getOne
, getOneById
, getWhereParams
, queryNoCache
, getTimestamp
, interpolate
, TIMESTAMP_FORMAT
};
