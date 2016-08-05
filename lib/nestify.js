
const op = require('object-path');


const SEPARATOR = '.';

const transform = (row) => {
  let result = {};

  for (let key in row) {
    op.set(result, key.split(SEPARATOR), row[key]);
  }

  return result;
};


module.exports = {
  transform
};
