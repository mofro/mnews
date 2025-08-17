const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const pluginReact = require("eslint-plugin-react");
const { defineConfig } = require("eslint/config");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = defineConfig([
  // Base configuration
  {
    ignores: ['.next/', 'node_modules/', 'out/'],
  },
  
  // JavaScript configuration
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
  },
  
  // TypeScript configuration
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  
  // React configuration
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react: pluginReact,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/prop-types': 'off', // Not needed with TypeScript
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  
  // Prettier integration (must be last)
  eslintConfigPrettier,
]);
