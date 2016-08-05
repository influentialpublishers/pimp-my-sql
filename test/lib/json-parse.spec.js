/*eslint-env node, mocha*/
const { expect } = require('chai');
const parser = require('../../lib/json-parse');


describe('lib/json-parse.js', function() {


  describe('::transform', function() {

    it('should transform a JSON: key value to an parsed JSON object',
    () => {

      const test_json_object = {
        x: 'a'
      , y: 'b'
      , z: 'c'
      };

      const test_row = {
        foo: 'bar'
      , baz: 'buzz'
      , 'JSON:meh': JSON.stringify(test_json_object)
      };

      const actual = parser.transform(test_row);

      expect(actual.foo).to.eql('bar');
      expect(actual.baz).to.eql('buzz');
      expect(actual.meh.x).to.eql('a');
      expect(actual.meh.y).to.eql('b');
      expect(actual.meh.z).to.eql('c');

    });

  });

});
