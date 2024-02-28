import { main } from "assemblyscript/asc";
import { join, relative } from "node:path";
import { findRoot } from "../utils/pathResolver.js";

export async function compile(testCodePaths: string[], outputFolder: string, compileFlags: string): Promise<string[]> {
  const pms: Promise<void>[] = [];
  const wasm: string[] = [];
  const root = findRoot(testCodePaths);
  const compile = async (testCodePath: string) => {
    const outputWasm = getNewPath(outputFolder, root, testCodePath).slice(0, -2).concat("wasm");
    wasm.push(outputWasm);
    const outputWat = getNewPath(outputFolder, root, testCodePath).slice(0, -2).concat("wat");
    let ascArgv = [
      testCodePath,
      "--outFile",
      outputWasm,
      "--textFile",
      outputWat,
      "--exportStart",
      "_start",
      "--sourceMap",
      "--debug",
    ];
    if (compileFlags) {
      const argv = compileFlags.split(" ");
      ascArgv = ascArgv.concat(argv);
    }
    const { error, stderr } = await main(ascArgv);
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      console.error(stderr.toString());
      throw error;
    }
  };
  for (const testCodePath of testCodePaths) {
    pms.push(compile(testCodePath));
  }
  await Promise.all(pms);
  return wasm;
}

function getNewPath(newFolder: string, oldFolder: string, srcPath: string): string {
  return join(newFolder, relative(oldFolder, srcPath)).replaceAll(/\\/g, "/");
}
