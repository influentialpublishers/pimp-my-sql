/*eslint-env node, mocha*/
const { expect } = require('chai');


describe('SQL Factory-Factory', function() {

  it('should be a function with an arity of 2', () => {

    expect(SqlFactory).to.be.a('function');
    expect(SqlFactory.lengt).to.eql(2);

  });

});
