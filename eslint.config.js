import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y"; // 1. Importer le plugin
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    // 2. Ajouter les règles recommandées du plugin
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      jsxA11y.configs.recommended, // Ajouté ici
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    // 3. (Optionnel) Ajouter le plugin à la liste des plugins
    plugins: {
      "jsx-a11y": jsxA11y,
    },
  },
]);
