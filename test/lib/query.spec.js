/*eslint-env node, mocha */
const R           = require('ramda');
const { expect }  = require('chai');
const { inspect } = require('util');
const sinon       = require('sinon');
const Query       = require('../../lib/query');

let testLib = null;

describe('Pimp My Sql :: Query', function() {

  beforeEach(() => testLib = ({
    query: sinon.stub().yields(null, 'foo')
  }));

  describe('::run', function() {

    it('should proxy to the given database library\'s query method',
    (done) => {

      const sql    = 'bar';
      const params = 'blah';

      Query.run(testLib, sql, params)

      .then((result) => {
        
        expect(result).to.eql('foo');
        expect(testLib.query.calledOnce).to.be.true;
        expect(testLib.query.calledWith('bar','blah')).to.be.true;

        done();

      })

      .catch(done);
    });


    it('should reject with the library provided error', (done) => {

      const error  = new Error('foo bar');
      const sql    = 'bar';
      const params = 'blah';

      testLib.query = sinon.stub().yields(error);

      Query.run(testLib, sql, params)

      .then(() => { throw new Error('Unexpected success') })

      .catch((err) => {

        expect(err.message).to.eql('foo bar');
        expect(testLib.query.calledOnce).to.be.true;
        expect(testLib.query.calledWith('bar', 'blah')).to.be.true;

        done();

      })

    });

  });


  describe('::cacheBust', function() {

    it('should append a random string comment to the end of the given sql',
    () => {

      const sql  = 'my test';
      const test = (prev) => {

        const result = Query.cacheBust(sql);

        if(R.find(R.equals(result), prev)) {
          throw new Error('Duplicate query');
        }

        return R.append(result, prev);
      };

      // run 100 tests
      R.reduce(test, [], R.range(0, 100));

    });

  });


  describe('::insert', function() {

    it('should create an insert query based on the table', () => {

      testLib.query = sinon.stub().yields(null, { insertId: 42 });

      const table = 'test';
      const params = { foo: 'bar' };
      const expected_sql = 'INSERT INTO `test` SET ?';
      const sql_matcher = sinon.match(expected_sql);

      return Query.insert(testLib, table, params)

      .then((insertId) => {

        expect(insertId).to.eql(42);
        expect(testLib.query.calledOnce).to.be.true;
        expect(testLib.query.calledWith(sql_matcher, params)).to.be.true;

      })

    });

  });


  describe('::rawInsert', function() {

    it('should return the last insert identifier', () => {

      testLib.query = sinon.stub().yields(null, { insertId: 42 });

      const sql       = 'my test';
      const params    = { foo: 'bar' };
      const sql_regex = new RegExp(sql + ' -- ');

      return Query.rawInsert(testLib, sql, params)

      .then((insertId) => {

        expect(insertId).to.eql(42);
        expect(testLib.query.calledOnce).to.be.true;
        expect(
          testLib.query.calledWith(sinon.match(sql_regex), params)
        ).to.be.true;

      });

    });


    it('should throw an exception when an insert fails', () => {

      const sql          = 'my test';
      const params       = { foo: 'bar' };
      const param_string = inspect(params);
      const expected     =
        `Insert Failed:\nSQL: ${sql}\nPARAMS: ${param_string}`;

      testLib.query = sinon.stub().yields(null, null);

      return Query.rawInsert(testLib, sql, params)

      .then(() => { throw new Error('Unexpected success') })

      .catch((err) => {

        expect(err.message).to.eql(expected)

      });

    });

  });


  describe('::rawUpdate', function() {

    it('should call the driver query method and return the affected row count',
    () => {

      const sql       = 'my test';
      const params    = { foo: 'bar' };
      const sql_regex = new RegExp(sql + ' -- ');
      testLib.query   = sinon.stub().yields(null, { affectedRows: 42 });

      Query.rawUpdate(testLib, sql, params)

      .then((affectedRows) => {

        expect(affectedRows).to.eql(42);
        expect(testLib.query.calledOnce).to.eql.true;
        expect(
          testLib.query.calledWith(sinon.match(sql_regex), params)
        ).to.be.true;

      });

    });

  });


  describe('::getWhereParams', function() {


    it('should assemble a query from the given options', () => {

      const table      = 'test';
      const projection = 'foo AS bar';
      const params     = {
        bar: 'baz'
      , boo: 'bah'
      };

      testLib.query = sinon.stub().yields(null, [ { foo: 42 } ]);
      testLib.escape = (x) => `'${x}'`;

      const sql_string = `SELECT foo AS bar FROM \`test\` WHERE 1 `
                       + ` AND bar = 'baz' `
                       + ` AND boo = 'bah' `

      return Query.getWhereParams(testLib, table, params, projection)

      .then((result) => {

        expect(result[0].foo).to.eql(42)
        expect(testLib.query.calledOnce).to.be.true
        expect(testLib.query.calledWith(sql_string, params)).to.be.true

      });

    });

  });

});
