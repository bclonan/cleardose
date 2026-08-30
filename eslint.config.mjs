import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

const eslintConfig = defineConfig([
  globalIgnores([
    "dist/**",
    "node_modules/**",
    ".sites-runtime/**",
    "**/*.ts",
  ]),
  js.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["src/**/*.{js,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.nodeBuiltin,
    },
  },
]);

export default eslintConfig;
