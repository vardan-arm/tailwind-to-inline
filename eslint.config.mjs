import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    ignores: ["dist/**/*"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "no-console": ["error"],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error"]
    },
  }
];
