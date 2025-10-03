
module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  extends: ['@react-native-community', 'prettier'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
  },
};
