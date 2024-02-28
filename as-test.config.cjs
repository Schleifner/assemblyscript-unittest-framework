// const { ImportsArgument } = require("assemblyscript-unittest-framework/dist");

module.exports = {
  /** file include in test */
  include: ["assembly", "tests-as"],

  /** optional: file exclude */
  exclude: [],

  /** optional: assemblyscript compile flag, default is --exportStart _start */
  flags: "",

  /**
   * optional: imports function, only available in node executor
   * @param {ImportsArgument} runtime
   * @returns
   */
  imports(runtime) {
    return {};
  },

  /** optional: unit test executor, use "node" or <c++ runtime path> */
  // runtime: "../wasm-minisim-mgu/build/mini-job-runtime/mini-job-runtime",
  runtime: "node",

  // optional: define the compiler-path outside the local repository; uses "npx asc" by default which requires assemblyscript dependency in job folder
  // compiler: "node ../wasm-toolchain/node_modules/assemblyscript/bin/asc",

  /** optional: template file path, default "coverage" */
  temp: "coverage",

  /** optional: report file path, default "coverage" */
  output: "coverage",

  /** optional: test result output format, default "table" */
  mode: ["html", "json", "table"],
};
