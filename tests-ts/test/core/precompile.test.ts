import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { precompile } from "../../../src/core/precompile.js";

test("listFunction transfrom", async () => {
  const transfromFunction = join(
    fileURLToPath(new URL(".", import.meta.url)),
    "..",
    "..",
    "..",
    "transform",
    "listFunctions.mjs"
  );
  const unittestPackages = await precompile(["tests-ts/fixture/transformFunction.ts"], [], [], transfromFunction);
  expect(unittestPackages.testCodePaths).toEqual([]);
  expect(unittestPackages.sourceFunctions).toMatchSnapshot();
});
