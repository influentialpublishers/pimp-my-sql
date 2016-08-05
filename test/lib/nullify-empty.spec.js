/*eslint-env node, mocha*/
const { expect } = require('chai');
const nullify = require('../../lib/nullify-empty');


describe('lib/nullify-empty', function() {

  describe('::transform', function() {

    it('should null out any empty objects', () => {

      const test = {
        foo: {
          bar: {
            baz: {}
          }
        }
      , bar: 'bleh'
      , moo: {
          foo: {}
        , boo: { blah: 'bleh' }
        }
      , boo: {}
      };


      const expected = {
        foo: null
      , bar: 'bleh'
      , moo: {
          foo: null
        , boo: { blah: 'bleh' }
        }
      , boo: null
      };

      const actual = nullify.transform(test);

      expect(actual).to.eql(expected);

    });

  });

});
