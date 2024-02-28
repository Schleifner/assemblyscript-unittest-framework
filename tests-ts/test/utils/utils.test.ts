import fs from "fs-extra";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { DebugInfo, CovDebugInfo } from "../../../src/interface.js";
import { isIncluded, json2map, checkFunctionName, checkGenerics } from "../../../src/utils/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

test("isIncluded", () => {
  expect(isIncluded([39, 47], [36, 50])).toEqual(true);
  expect(isIncluded([36, 50], [36, 50])).toEqual(true);
  expect(isIncluded([33, 38], [36, 50])).toEqual(false);
  expect(isIncluded([38, 52], [36, 50])).toEqual(false);
});

test("json2map", () => {
  const debugInfoFile = join(__dirname, "..", "..", "fixture", "ifBlock.debugInfo.json");
  // eslint-disable-next-line import/no-named-as-default-member
  const debugInfo = fs.readJsonSync(debugInfoFile) as DebugInfo;

  expect(debugInfo.debugFiles).toEqual(["index.ts"]);

  const debugInfos = json2map(debugInfo.debugInfos);
  const expectDebugInfos = new Map<string, CovDebugInfo>();
  expectDebugInfos.set("main", {
    branchInfo: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ],
    index: 0,
    lineInfo: [
      [
        [0, 2, 1],
        [0, 3, 1],
      ],
      [[0, 5, 1]],
      [
        [0, 8, 1],
        [0, 9, 1],
      ],
      [
        [0, 11, 1],
        [0, 10, 1],
      ],
      [[0, 12, 1]],
      [[0, 6, 1]],
    ],
  });
  expect(debugInfos).toEqual(expectDebugInfos);
});

test("checkFunctionName", () => {
  expect(checkFunctionName("source/someip.ts", "source/someip/addNewEntryToProvisioningArray")).toEqual(true);
  expect(checkFunctionName("source/someip.ts", "start:source/someip~anonymous|3~anonymous|1")).toEqual(true);
});

test("checkGenerics", () => {
  expect(checkGenerics("test<~lib/string/String|null>")).toEqual("test");
  expect(checkGenerics("Value<i32>#greaterThan")).toEqual("Value#greaterThan");
  expect(checkGenerics("toJson<~lib/array/Array<~lib/array/Array<~lib/string/String>>>")).toEqual("toJson");
  expect(checkGenerics("Value<~lib/array/Array<i32>>#lessThan")).toEqual("Value#lessThan");
  expect(checkGenerics("noGenerics")).toEqual(undefined);
  expect(checkGenerics("func<")).toEqual(undefined);
  expect(checkGenerics("fun>a")).toEqual(undefined);
});
