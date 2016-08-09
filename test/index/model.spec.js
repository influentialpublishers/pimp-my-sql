/*eslint-env node, mocha*/
const { expect } = require('chai');
const sinon      = require('sinon');
const { Model }  = require('../../index');

describe('Pimp-My-Sql Model', function() {

  let TestModel = null;
  const TestSql = {
    select:
      'SELECT\n' +
      ' `test`.`id` AS `id`\n' +
      ',`test`.`name` AS `name`\n' +
      ',`foo`.`id` AS `foo.id`\n' +
      ',`foo`.`name` AS `foo.name`\n'

  , join:
     'JOIN `foo`\n' +
     '  ON `test`.`foo_id` = `foo`.`id`\n'
  , where: 'WHERE `test`.`deleted` <> 1'
  , order: 'ORDER BY `test`.`id` DESC'
  , group: 'GROUP BY `test`.`id`'
  };
  
const sqlGetById =
  'SELECT\n' +
  ' `test`.`id` AS `id`\n' +
  ',`test`.`name` AS `name`\n' +
  ',`foo`.`id` AS `foo.id`\n' +
  ',`foo`.`name` AS `foo.name`\n' +
  ' \n' +
  'FROM `test` \n' +
  'JOIN `foo`\n' +
  '  ON `test`.`foo_id` = `foo`.`id`\n' +
  ' \n' +
  'WHERE `test`.`deleted` <> 1\n' +
  ' AND `test`.`id` = ?  \n' +
  'ORDER BY `test`.`id` DESC \n' +
  'GROUP BY `test`.`id`'
;

  beforeEach(() => {
    TestModel = Model({
      table: 'test'
    , sql: TestSql
    })
  });


  describe('::getById', function() {

    it('should query the data store using the sql factory to build the query',
    () => {

      const expected_params = [ 42 ];

      const db = {
        query: (sql, params, cb) => {

          expect(params).to.eql(expected_params);
          expect(sql).to.eql(sqlGetById);

          return cb(null,  [{
            id: 42
          , name: 'foo'
          , 'foo.id': 1
          , 'foo.name': 'bar'
          }]);

        }
      };

      return TestModel.getById(db, 42)

      .then((model) => {

        expect(model.id).to.eql(42);
        expect(model.name).to.eql('foo');
        expect(model.foo.id).to.eql(1);
        expect(model.foo.name).to.eql('bar');

      })

    });

  });


  describe('::save', function() {

    it('should generate an insert query when current is not provided', () => {

      const expected_insert_params = { name: 'foo' };
      const matcher = sinon.match(/INSERT INTO `test` SET \? -- /);

      const query = sinon.stub()

      query
        .withArgs(matcher, expected_insert_params)
        .yields(null, { insertId: 42 })

      query
        .withArgs(sqlGetById, [ 42 ])
        .yields(null, [{
          id: 42
        , name: 'foo'
        , 'foo.id': 1
        , 'foo.name': 'bar'
        }])

      const db = { query }

      return TestModel.save(db, expected_insert_params)

      .then((test_model) => {

        expect(test_model.id).to.eql(42);
        expect(test_model.name).to.eql('foo');
        expect(test_model.foo.id).to.eql(1);
        expect(test_model.foo.name).to.eql('bar');

      });

    });

  });

});
