// ESLint v9 flat config for the EcoTrack AI frontend.
// Explicit rule set — avoids depending on @eslint/js preset versions that may
// drift from the installed ESLint core.

import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "build/**",
      "dist/**",
      "public/**",
      "coverage/**",
      "src/components/ui/**", // third-party shadcn primitives — vendor code
      "src/hooks/use-toast.js", // vendor-derived shadcn boilerplate
    ],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        process: "readonly",
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // Core JS sanity rules — explicit list to avoid preset version drift
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      // React-specific
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-key": "warn",
      // Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off", // intentional stable singleton/setter pattern
    },
  },
];
