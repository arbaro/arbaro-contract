const deploy = require(`./deploy`);
const others = require(`./others`);

const randomNumber = (min = 1, max = 100000) =>
  Math.floor(Math.random() * (+max - +min)) + +min;

module.exports = {
  ...deploy,
  ...others,
  randomNumber
};
