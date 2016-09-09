/*eslint-env node, mocha*/
const { expect } = require('chai');
const SqlFactory = require('../../lib/factory-sql');


describe('SQL Factory-Factory', function() {

  it('should be a function with an arity of 2', () => {

    expect(SqlFactory).to.be.a('function');
    expect(SqlFactory.length).to.eql(2);

  });


  it('should throw a TypeError if you do not provide a table name', () => {

    const test = () => SqlFactory();

    expect(test).to.throw(
      TypeError
    , /You must provide the table <string> parameter./
    )

  });


  it('should return a function with an arity of 1', () => {

    const actual = SqlFactory('test');
    expect(actual).to.be.a('function');
    expect(actual.length).to.eql(1);

  });


  it('should generate a basic SQL string', () => {

    const actual = SqlFactory('test')();
    const expected =
      'SELECT `test`.* \n' +
      'FROM `test` \n' +
      ' \n' +
      'WHERE 1 \n' +
      ' \n'
    ;

    expect(actual).to.eql(expected);

  });


  it('should allow a user only clase (no base)', () => {

    const actual   = SqlFactory('test')({ order: 'ORDER BY `foo`.`id`' });
    const expected =
      'SELECT `test`.* \n' +
      'FROM `test` \n' +
      ' \n' +
      'WHERE 1 \n' +
      ' \n' +
      'ORDER BY `foo`.`id`'
    ;

    expect(actual).to.eql(expected);
  });


  it('should generate a SQL string based on the user\'s given clauses', () => {

    const base = {
      select:
        'SELECT \n' +
        '  `id` AS `id` \n' +
        ', `name` AS `foo` \n' +
        ', `test` AS `bar` \n'
    , join:
        'JOIN `other` AS `o` \n' +
        '  ON `test`.`other_id` = `o`.`id` \n'
    , where: 'WHERE `test`.`deleted` <> 1 '
    , order: 'ORDER BY `test`.`id` ASC '
    , group: 'GROUP BY `test`.`id` '
    };

    const user = {
      select:
        ' `foo` AS `fuzz` \n' +
        ', `buzz` AS `baz` \n'
    , join:
        'JOIN `blah` \n' +
        '  ON `test`.`blah_id` = `blah`.`id` \n'
    , where: 'AND `test`.`id` = ?'
    , order: '`test`.`created` DESC'
    , group: '`test`.`created`'
    }
    const actual = SqlFactory('test', base)(user);

    const expected =
      'SELECT \n' +
      '  `id` AS `id` \n' +
      ', `name` AS `foo` \n' +
      ', `test` AS `bar` \n' +
      '\n' +
      ', `foo` AS `fuzz` \n' +
      ', `buzz` AS `baz` \n' +
      ' \n' +
      'FROM `test` \n' +
      'JOIN `other` AS `o` \n' +
      '  ON `test`.`other_id` = `o`.`id` \n' +
      '\n' +
      'JOIN `blah` \n' +
      '  ON `test`.`blah_id` = `blah`.`id` \n' +
      ' \n' +
      'WHERE `test`.`deleted` <> 1 \n' +
      'AND `test`.`id` = ? \n' +
      'GROUP BY `test`.`id` \n' +
      ',`test`.`created` \n' +
      'ORDER BY `test`.`id` ASC \n' +
      ',`test`.`created` DESC'

    expect(actual).to.eql(expected);

  });

});
