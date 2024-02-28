const path = require("path");

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [path.join(__dirname, "tsconfig.json")],
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],

  rules: {
    // Namespaces are quite useful in AssemblyScript
    "@typescript-eslint/no-namespace": "off",

    // There is actually codegen difference here
    "@typescript-eslint/no-array-constructor": "off",

    // Sometimes it can't be avoided to add a @ts-ignore
    "@typescript-eslint/ban-ts-comment": "off",

    // Not all types can be omitted in AS yet
    "@typescript-eslint/no-inferrable-types": "off",

    // The compiler has its own `Function` class for example
    "@typescript-eslint/ban-types": "off",
  },
};