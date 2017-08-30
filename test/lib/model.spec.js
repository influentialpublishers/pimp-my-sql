/*eslint-env node, mocha */
const R           = require('ramda');
const { expect }  = require('chai');
const { inspect } = require('util');
const sinon       = require('sinon');
const { Model }   = require('../../index.js');

let testLib = null;

describe('Pimp My Sql :: Model', function() {

  beforeEach(() => testLib = ({
    query: sinon.stub().yields(null, [['foo']]),
    escape : (x) => `'${x}'`                                                                                                 
  }));

  describe('::filter', function() {

    const model = Model({
      table: 'test_table',

      sql : {
        select: ' SELECT `test_table`.`id` AS `id` ',
        join: ' JOIN `test_join` ON `test_join`.`test_id` = `test_table`.`id` ',
        where: ' WHERE `test_table`.`deleted` = 0 ',
        group: ' GROUP BY `test_table`.`id` ',
        order: ' ORDER BY `test_table`.`created` '
      }
    })

    it('should use param map to interpolate filter query',
    (done) => {

      const map = {
        param_one: () => ({
          select: ' `test_table`.`content` AS `content` ',
          where: ' `test_table`.`tag` = :param_one '
        }),
        param_two: () => ({
          join: ' JOIN `param_join` ON `param_join`.`id` = `test_table`.`param_id` ',
          where: ' AND `param_join`.`tag` = :param_two '
        }),
        param_nil: () => ({    
          select: 'BAD SELECT',
          join: 'BAD JOIN',
          where: 'BAD WHERE'
        })
      }

      const params = {
        param_one: 'PARAM_ONE',
        param_two: 'PARAM_TWO'
      }

      const expected_sql = ` SELECT \`test_table\`.\`id\` AS \`id\` 
, \`test_table\`.\`content\` AS \`content\`  
 FROM \`test_table\` 
 JOIN \`test_join\` ON \`test_join\`.\`test_id\` = \`test_table\`.\`id\` 
 JOIN \`param_join\` ON \`param_join\`.\`id\` = \`test_table\`.\`param_id\`  
 WHERE \`test_table\`.\`deleted\` = 0 
 \`test_table\`.\`tag\` = 'PARAM_ONE'   AND \`param_join\`.\`tag\` = 'PARAM_TWO'  
 GROUP BY \`test_table\`.\`id\`  
 ORDER BY \`test_table\`.\`created\`  `

     const sql_matcher = sinon.match(expected_sql)
      
      model.filter(map, testLib, params)

      .then((result) => {

        expect(result).to.eql([{ 0: "foo" }]);
        expect(testLib.query.calledOnce).to.be.true;
        // TODO: Fix sql comparison
        //expect(testLib.query.calledWithExactly(sql_matcher,[])).to.be.true;

        done();

      })

      .catch(done)
    })
  })
})
