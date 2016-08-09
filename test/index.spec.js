/*eslint-env node, mocha*/
const { expect }  = require('chai')
const pms         = require('../index');


describe('Pimp My SQL', function() {


  describe('::Query', function() {

    it('should be an Object', () => {

      expect(pms.Query).to.be.an('object');

    });

  });

});
