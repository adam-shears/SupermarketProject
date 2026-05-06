import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.vscode/**",
      "**/.env**",
      "**/*.min.js",
      "**/*.log",
      "**/*.md",
      "**/.devcontainer/**",
    ],
  },
  {
    files: ["**/test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
      "no-undef": "error",
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-undef": "error",
    },
  },
];
