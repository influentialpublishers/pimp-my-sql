const debug           = require('debug')('PIMPMYSQL:QUERY');
const chalk           = require('chalk');
const _               = require('ramda');
const moment          = require('moment');
const Bluebird        = require('bluebird');
const { randomBytes } = require('crypto');
const { inspect }     = require('util');
const jsonparse       = require('./json-parse');
const nestify         = require('./nestify');
const nullify         = require('./nullify-empty');

const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const LARGEST_UNIX_TIMESTAMP = 2147483647;

const bindError = _.curry((fn, sql, params) => fn.bind(null, sql, params));


const idMatch = _.curry((id, obj) => id + '' === obj.id + '');


const dateIsUnix = _.compose(_.equals(0), _.modulo(_.__, 1));

const dateIsMs = _.compose(
  _.ifElse(
    _.lt(LARGEST_UNIX_TIMESTAMP),
    _.T,
    _.F
  )
, parseInt
)


const momentFromString = (date) => moment(new Date(date));


const momentFromDate = _.cond([
  [ _.isNil,         moment ]
, [ moment.isMoment, _.identity ]
, [ dateIsMs,        (ms) => moment(parseInt(ms)) ]
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


const run = _.curry((db, sql, params) => new Bluebird((resolve, reject) => {
  const sql_tag = chalk.blue('SQL:');
  const param_tag = chalk.blue('PARAMS:');
  debug(`\n ${sql_tag} \n ${sql} \n ${param_tag} \n ${inspect(params)} \n`);

  db.query(sql, params, (err, results) => {

    if (err) return reject(err);

    return resolve(results);

  });

}));


const cacheBust = (sql) => {
  const random = randomBytes(8).toString('hex') + (new Date()).getTime();
  return `${sql} -- ${random}`;
};


const runNoCache = _.curry((db, sql, params) => {
  return run(db, cacheBust(sql), params);
});


const rawInsert = _.curry((db, sql, params) => {

  return runNoCache(db, sql, params)

  .then(_.ifElse(
    _.compose(_.propOr(null, 'insertId'))

  , _.prop('insertId')

  , () => throwInsertFailedError(sql, params)

  ));

});


const rawUpdate = _.curry((db, sql, params) => {

  return runNoCache(db, sql, params)

  .then(_.propOr(null, 'affectedRows'))

});


const insert = _.curry((db, table, params) => {
  const sql = `INSERT INTO \`${table}\` SET ?`;
  return rawInsert(db, sql, params);
});


const bulkInsert = _.curry((db, table, params) => {
  const keys = _.compose(
    _.join(',')
  , _.map(x => db.escapeId(x))
  , _.keys
  , _.head
  )(params)

  const values = _.compose(
    x => db.escape(x)
  , _.map(_.values)
  )(params)

  const sql = `INSERT INTO \`${table}\` (${keys}) VALUES ${values}`

  return rawInsert(db, sql, [])
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

  return run(db, sql, params);

});


const deactivate = _.curry((db, table, id) => {
  const sql = `
    UPDATE \`${table}\`
    SET \`${table}\`.\`active\` = 0
    WHERE \`${table}\`.\`id\` = ?
  `;
  const params = [ id ];

  return run(db, sql, params);

});


const deleteById = _.curry((db, table, id) => {
  const sql = `DELETE FROM \`${table}\` WHERE \`${table}\`.\`id\` = ? `;
  const params = [ id ];

  return run(db, sql, params);

});


const softDelete = _.curry((db, table, id) => {
  const sql = `
    UPDATE \`${table}\`
    SET \`${table}\`.\`deleted\` = CURRENT_TIMESTAMP()
    WHERE \`${table}\`.\`id\` = ?
  `;
  const params = [ id ];

  return run(db, sql, params);

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

  return run(db, sql, params);

});


const select = _.curry((db, sql, params, no_cache = false) => {

  const runner    = no_cache ? runNoCache : run;

  const transform = _.compose(
    nullify.transform
  , nestify.transform
  , jsonparse.transform
  );

  return runner(db, sql, params)

  .map(transform)

});


const getOne = _.curry((db, sql, params, no_cache = false) => {

  const throwError = bindError(throwNotFoundError, sql, params);

  return select(db, sql, params, no_cache)

  .then(_.head)

  .then(_.unless(_.identity, throwError));

});


const getOneById = _.curry((db, sql, id, no_cache = false) => {

  const throwError = bindError(throwNotFoundError, sql, id);

  return getOne(db, sql, [id], no_cache)

  .tap(_.unless(idMatch(id), throwError));

});


// getTimestamp ::  (any, string) -> string | null | Error
const getTimestamp = (date) => {

  if (date == null) {
    return null;
  }

  const m = momentFromDate(date);

  if (m.isValid()) {
    return m.format(TIMESTAMP_FORMAT);
  }

  throw new Error('Invalid Input')

};


const interpolate = _.curry((db, sql, params) => {
  if (typeof params !== 'object') {
    throw TypeError('InvalidParameters');
  }

  return sql.replace(/\:(\w+)/g, (txt, key) => {

    if (params.hasOwnProperty(key)) {
      return db.escape(params[key]);
    }

    return txt;

  });

});


const getWhereParams = _.curry(
  (db, table, params, project = '*', no_cache = false) => {

    const select_clause = `SELECT ${project} FROM \`${table}\` WHERE 1 `;
    const where = _.compose(
      _.join('')
    , _.map((key) => ` AND ${key} = :${key} `)
    , _.keys
    )(params);


    const sql = interpolate(db, select_clause + where, params);

    return select(db, sql, params, no_cache);

  }
);


module.exports = {
  run
, cacheBust
, rawInsert
, rawUpdate
, insert
, bulkInsert
, update
, updateWhere
, incrementField
, deactivate
, deleteById
, softDelete
, softCompoundDelete
, select
, getOne
, getOneById
, getWhereParams
, runNoCache
, getTimestamp
, interpolate
, TIMESTAMP_FORMAT
};
