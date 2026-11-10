import js from "@eslint/js";

export default [
  js.configs.recommended,
  { ignores: ["**/node_modules/**", "**/.next/**", "**/.expo/**", "**/dist/**", "docs/design/**", "apps/mobile/**"] },
  {
    files: ["packages/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { console: "readonly", process: "readonly", fetch: "readonly" },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
