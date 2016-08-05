
const op = require('object-path');


const SEPARATOR = '.';

const transform = (row) => {
  let result = {};

  for (let key in row) {
    if( row.hasOwnProperty(key) ) {
      op.set(result, key.split(SEPARATOR), row[key]);
    }
  }

  return result;
};


module.exports = {
  transform
};
