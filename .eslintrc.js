/*
 * @Description: eslint
 * @Author: ekibun
 * @Date: 2019-12-27 16:55:03
 * @LastEditors  : ekibun
 * @LastEditTime : 2019-12-31 19:43:54
 */
module.exports = {
  "env": {
    "commonjs": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "airbnb-base"
  ],
  "globals": {
    "Atomics": "readonly",
    "SharedArrayBuffer": "readonly"
  },
  "parserOptions": {
    "ecmaVersion": 2018
  },
  "rules": {
    "indent": ["error", 2],
    "curly": 0,
    "global-require": 0,
    "import/no-dynamic-require": 0,
    "no-restricted-syntax": 0,
    "no-continue": 0,
    "no-bitwise": 0,
    "no-await-in-loop": 0,
    "no-underscore-dangle": 0,
    "linebreak-style": 0
  }
};
