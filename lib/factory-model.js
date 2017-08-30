
const Model      = require('./model');
const SqlFactory = require('./factory-sql');

const ModelFactory = ({ table, sql, intercepts = {} }) => {

  const sql_factory = SqlFactory(table, sql);

  return {
    getById            : Model.getById(sql_factory)
  , get                : Model.get(sql_factory)
  , getOne             : Model.getOne(sql_factory)
  , getWhere           : Model.getWhere(sql_factory)
  , getWhereNoCache    : Model.getWhereNoCache(sql_factory)
  , getOneWhere        : Model.getOneWhere(sql_factory)
  , getOneWhereNoCache : Model.getOneWhereNoCache(sql_factory)
  , incrementField     : Model.incrementField(sql_factory)
  , deactivate         : Model.deactivate(intercepts, sql_factory)
  , softDelete         : Model.softDelete(intercepts, sql_factory)
  , save               : Model.save(intercepts, sql_factory)
  , search             : Model.search(sql_factory)
  , filter             : Model.filter(sql_factory)
  };

};

module.exports = ModelFactory;
