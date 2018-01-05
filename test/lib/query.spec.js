/*eslint-env node, mocha */
const R           = require('ramda');
const moment      = require('moment');
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


  describe('::bulkInsert', function() {

    it('should create a bulk insert query based on the table and params',
    () => {

      const surround = (char, x) => char + x + char;
      const surround_all = (char, x) => x.map(surround.bind(null, char));


      testLib.escapeId = x => surround('`', x);
      testLib.escape = x =>
        x.map(y => '(' + surround_all("'", y).join(',') + ')')
        .join(',');


      const table = 'test';
      const params = [
        { foo: 'bar', baz: 'moo' },
        { foo: 'bar', baz: 'buzz' }
      ];
      const expected_sql =
        'INSERT INTO `test` (`foo`,`baz`) VALUES ' +
        "('bar','moo'),('bar','buzz')";
      const sql_matcher  = sinon.match(expected_sql);


      testLib.query = sinon.stub().yields(null, { insertId: 42 });


      return Query.bulkInsert(testLib, table, params)

      .then(insertId => {

        expect(insertId).to.eql(42);
        expect(testLib.query.calledOnce).to.be.true;
        expect(testLib.query.calledWith(sql_matcher, [])).to.be.true;

      })

    })

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


  describe('::deleteById', () => {


    it('should replace table name and where parameter in delete query', () => {
      testLib.query = sinon.stub().yields(null, true);

      const table = 'test';
      const id = '1'
      const params = [id];
      const expected_sql = 'DELETE FROM `test` WHERE `test`.`id` = ? ';

      return Query.deleteById(testLib, table, id)

      .then((result) => {
        expect(result).to.be.true;
        expect(testLib.query.calledOnce).to.be.true;
        expect(testLib.query.calledWith(expected_sql, params)).to.be.true;

      })

    })
  })

  describe('::getTimestamp', () => {
    it('should return a proper date and time for a unix timestamp', () => {

      const input = 1515188138
      const result = Query.getTimestamp(input)

      expect(result).to.eql('2018-01-05 13:35:38');

    })

    it('should return a proper date and time for a string of a unix timestamp', () => {

      const input = '1515188138'
      const result = Query.getTimestamp(input)

      expect(result).to.eql('2018-01-05 13:35:38');

    })

    it('should return a proper date and time for a moment value', () => {

      const input = moment('2017-07-07 13:07:07')
      const result = Query.getTimestamp(input)

      expect(result).to.eql('2017-07-07 13:07:07');

    })

    it('should return a proper date and time for a formatted date', () => {

      const input = '12/31/2017'
      const result = Query.getTimestamp(input)

      expect(result).to.eql('2017-12-31 00:00:00');

    })

    it('should return a proper date and time for a typed out date', () => {

      const input = 'January 20, 2017'
      const result = Query.getTimestamp(input)

      expect(result).to.eql('2017-01-20 00:00:00');

    })

    it('should return null for an incorrectly typed out date', () => {

      const input = 'June 17th, 2017'
      const result = Query.getTimestamp(input)

      expect(result).to.eql(null);

    })


    it('should return null for null input', () => {

      const nullInput = null
      const result = Query.getTimestamp(nullInput)

      expect(result).to.eql(null);

    })

    it('should return null for garbage input', () => {

      const input = 'thisisgarbateinput'
      const result = Query.getTimestamp(input)

      expect(result).to.eql(null);

    })

  })

});
