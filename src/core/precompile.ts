/**
 * Will transform all source file to get all relative functions
 */

import ignore from "ignore";
import { fileURLToPath, URL } from "node:url";
import { main } from "assemblyscript/asc";
import { join, relative, resolve } from "node:path";
import { getIncludeFiles } from "../utils/pathResolver.js";
import { SourceFunctionInfo, UnittestPackage } from "../interface.js";

const sourceFunctions = new Map<string, SourceFunctionInfo[]>();
const listFunctions = join(fileURLToPath(new URL(".", import.meta.url)), "..", "transform", "listFunctions.mjs");

export async function precompile(
  includes: string[],
  excludes: string[],
  testcases: string[] | undefined,
  transformFunction = listFunctions
): Promise<UnittestPackage> {
  // if specify testcases, use testcases for unittest
  // otherwise, get testcases(*.test.ts) in includes directory
  const testCodePaths = testcases ?? getRelatedFiles(includes, excludes, (path: string) => path.endsWith(".test.ts"));

  const sourceCodePaths = getRelatedFiles(includes, excludes, (path: string) => !path.endsWith(".test.ts"));
  const sourceCodeTransfroms: Promise<void>[] = [];
  for (const sourceCodePath of sourceCodePaths.values()) {
    sourceCodeTransfroms.push(transform(sourceCodePath, transformFunction));
  }
  await Promise.all(sourceCodeTransfroms);

  return {
    testCodePaths,
    sourceFunctions,
  };
}

// a. include in config
// b. exclude in config
export function getRelatedFiles(includes: string[], excludes: string[], filter: (path: string) => boolean) {
  const result: string[] = [];
  const includeFiles = getIncludeFiles(includes, (path) => path.endsWith(".ts")); // a
  const exc = ignore.default().add(excludes);

  for (const path of includeFiles) {
    const relativedPath = relative(".", path);
    if (relativedPath.startsWith("..")) {
      throw new Error(`file ${path} out of scope (${resolve(".")})`);
    }
    if (exc.ignores(relativedPath)) {
      continue; // ab
    }
    if (filter(path)) {
      result.push(path.replaceAll(/\\/g, "/"));
    }
  }
  return result;
}

async function transform(sourceCodePath: string, transformFunction: string) {
  const { error, stderr } = await main([
    sourceCodePath,
    "--noEmit",
    "--disableWarning",
    "--transform",
    transformFunction,
  ]);
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    console.error(stderr.toString());
    throw error;
  }
  sourceFunctions.set(sourceCodePath, functionInfos as SourceFunctionInfo[]);
}
