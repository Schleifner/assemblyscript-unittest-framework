module.exports = {
  include: ["example"],
  exclude: ["assembly/coverageCollector.ts", "assembly/mock.ts"],

  /** assemblyscript compile flag, default is --exportStart _start --sourceMap --debug*/
  flags: "",

  /**
   * imports function, only available in node executor
   * @param {ImportsArgument} runtime
   * @returns
   */
  imports(runtime) {
    return {};
  },

  /** unit test executor, use "node" or <c++ runtime path> */
  // runtime: "../wasm-minisim-mgu/build/mini-job-runtime/mini-job-runtime",
  runtime: "node",

  /** template file path, default "coverage" */
  temp: "coverage",

  /** report file path, default "coverage" */
  output: "coverage",
};
