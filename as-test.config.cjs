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

  /** optional: unit test executor, use "node" or <some other runtime path>, default is "node" */
  runtime: "node",

  /** optional: template file path, default "coverage" */
  temp: "coverage",

  /** optional: report file path, default "coverage" */
  output: "coverage",

  /** optional: test result output format, default "table" */
  mode: ["html", "json", "table"],
};
