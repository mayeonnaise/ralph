const path = require('path');

module.exports = {
  entry: ['./src/browser_client.js', './src/blockchain.js'],
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
};