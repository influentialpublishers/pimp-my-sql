
const _ = require('ramda');

const TOKEN_JSON = 'JSON:';


const isJsonRow = _.compose(_.equals(0), _.indexOf(TOKEN_JSON));


const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`Could not parse value:\n${value}\n${err.message}`);
  }
};


const removeJsonToken = _.replace(/JSON:/, '');


const transform = (row) => {
  for (let key in row) {

    if (row.hasOwnProperty(key) && isJsonRow(key)) {

      const new_key = removeJsonToken(key);
      const parsed  = parseJson(row[key]);

      row[new_key]  = parsed;

      delete row[key];

    }

  }

  return row;
};

module.exports = {
  transform
};
