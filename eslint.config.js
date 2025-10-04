const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname
});

module.exports = [
  ...compat.extends('@react-native-community', 'prettier'),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['backend/**', 'node_modules/**', 'dist/**'],
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }]
    }
  }
];
