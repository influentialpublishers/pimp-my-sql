/*eslint-env node, mocha */
const { expect } = require('chai');
const nestify    = require('../../lib/nestify');


describe('lib/nestify.js', function() {

  describe('::transform', function() {

    it('should transform dot-separated notation into nested objects',
    () => {

      const test = {
        'foo.bar.baz': 'blah'
      , 'foo.bar.buzz': 'blahblah'
      , 'foo.bar.meh': 'blahblahblah'
      , 'bar': 'bleh'
      , 'moo.foo': 'blehbleh'
      , 'moo.boo': 'blehblehbleh'
      };


      const expected = {
        foo: {
          bar: {
            baz: 'blah'
          , buzz: 'blahblah'
          , meh: 'blahblahblah'
          }
        }
      , bar: 'bleh'
      , moo: {
          foo: 'blehbleh'
        , boo: 'blehblehbleh'
        }
      };

      const actual = nestify.transform(test);

      expect(actual).to.deep.eql(expected);

    });

  });

});
