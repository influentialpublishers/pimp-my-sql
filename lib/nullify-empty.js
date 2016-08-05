
const isPlainObject = require('is-plain-object');


const nullify = (item) => {

  if (item.hasOwnProperty('id') && !item.id) return null;

  let is_nullifiable = true;

  for (let key in item) {

    if (item[key] === null) continue;

    if (isPlainObject(item[key])) item[key] = nullify(item[key]);

    if (is_nullifiable && item[key] !== null) is_nullifiable = false;

  }

  return is_nullifiable ? null : item;

};


const transform = (row) => {

  for (let key in row) {
    row[key] = isPlainObject(row[key]) ? nullify(row[key]) : row[key];
  }

  return row;

};


module.exports = {
  transform
};
