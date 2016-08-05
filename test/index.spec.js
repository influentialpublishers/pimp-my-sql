/*eslint-env node, mocha*/
const _           = require('ramda');
const { expect }  = require('chai')
const { inspect } = require('util');
const {
  stub
, match
}                 = require('sinon');
const pms         = require('../index');


describe('Pimp My SQL', function() {


  describe('::query', function() {

    it('should be a function', () => {

      expect(pms.query).to.be.a('function');

    });


    it("should proxy to the given database library's query method", (done) => {

      const testlib = { query: stub().yields(null, 'foo') };
      const sql = 'bar';
      const params = 'blah';

      pms.query(testlib, sql, params)

      .then((result) => {

        expect(result).to.eql('foo');
        expect(testlib.query.calledOnce).to.be.true;
        expect(testlib.query.calledWith('bar', 'blah')).to.be.true;

        done();

      })

      .catch(done);

    });


    it('should reject with the library provided error', (done) => {

      const error = new Error('foo bar');
      const testlib = { query: stub().yields(error) };
      const sql = 'bar';
      const params = 'blah';


      pms.query(testlib, sql, params)

      .then(() => { throw new Error('Unexpected Success') })

      .catch((err) => {

        expect(err.message).to.eql('foo bar');
        expect(testlib.query.calledOnce).to.be.true;
        expect(testlib.query.calledWith('bar', 'blah')).to.be.true;

        done();

      })

    });

  });


  describe('::noCacheQuery', function() {

    it('should append a random string comment to the end of the given sql',
    () => {

      const sql = 'my test';
      const test = (prev) => {

        const result = pms.cacheBust(sql);

        if (_.find(_.equals(result), prev)) {
          throw new Error('Duplicate query');
        }

        return _.append(result, prev);

      };

      //run 1000 tests
      _.reduce(test, [], _.range(0, 100));

    });

  });


  describe('::insert', function() {

    it('should create an insert query based on the table', () => {

      const db           = { query: stub().yields(null, { insertId: 42 }) };
      const table        = 'test';
      const params       = { foo: 'bar' };
      const expected_sql = 'INSERT INTO `test` SET ?';
      const sql_match    = match(expected_sql);

      pms.insert(db, table, params)

        .then((insertId) => {

          expect(insertId).to.eql(42);
          expect(db.query.calledOnce).to.be.true;
          expect(db.query.calledWith(sql_match, params)).to.be.true;

        })

    });


  });


  describe('rawInsert', function() {

    it('should return the last insert identifier', (done) => {

      const sql     = 'my test';
      const testlib = { query: stub().yields(null, { insertId: 42 }) };
      const params  = { foo: 'bar' };

      pms.rawInsert(testlib, sql, params)

      .then((insertId) => {

        const sql_regex = new RegExp(sql + ' -- ');

        expect(insertId).to.eql(42);
        expect(testlib.query.calledOnce).to.be.true;
        expect(testlib.query.calledWith(match(sql_regex), params)).to.be.true;
        done();

      })

      .catch(done);
    
    });


    it('should throw an exception when an insert fails', (done) => {

      const sql          = 'my test';
      const params       = { foo: 'bar' };
      const param_string = inspect(params);
      const testlib      = { query: stub().yields(null, null) };

      pms.rawInsert(testlib, sql, params)

      .then(() => done(new Error('Unexpected Success')))

      .catch((err) => {

        const expected = `Insert Failed:\nSQL: ${sql}\nPARAMS: ${param_string}`;

        expect(err.message).to.eql(expected);
        done();

      });

    });

  });


  describe('rawUpdate', function() {

    it('should call driver query method and return the affected row count',
    (done) => {

      const db = { query: stub().yields(null, { affectedRows: 42 }) };
      const sql = 'my test';
      const params = { foo: 'bar' };

      pms.rawUpdate(db, sql, params)

      .then((affectedRows) => {

        const sql_regex = new RegExp(sql + ' -- ');

        expect(affectedRows).to.eql(42);
        expect(db.query.calledOnce).to.be.true;
        expect(db.query.calledWith(match(sql_regex), params)).to.be.true;
        done();

      })
    
      .catch(done);

    });

  });

});
