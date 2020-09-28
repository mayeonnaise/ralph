const path = require('path');

module.exports = {
  entry: ['./src/master_client.js', './src/blockchain.js'],
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'master'),
  },
};