import { WASI } from "node:wasi";
import { promises } from "node:fs";
import { ensureDirSync } from "fs-extra";
import { basename, join } from "node:path";
import { instantiate, Imports as ASImports } from "@assemblyscript/loader";
import { AssertResult } from "../assertResult.js";
import { Imports, ImportsArgument } from "../index.js";
import { IAssertResult, InstrumentResult } from "../interface.js";
import { mockInstruFunc, covInstruFunc } from "../utils/import.js";
const readFile = promises.readFile;

function nodeExecutor(wasms: string[], outFolder: string, imports: Imports) {
  return Promise.all(
    wasms.map(async (wasm) => {
      const wasi = new WASI({
        args: ["node", basename(wasm)],
        env: process.env,
        preopens: {
          "/": outFolder,
        },
        version: "preview1",
      });

      const importsArg = new ImportsArgument();
      const userDefinedImportsObject = imports === null ? {} : imports(importsArg);
      const importObject: ASImports = {
        wasi_snapshot_preview1: wasi.wasiImport,
        mockInstrument: mockInstruFunc,
        ...covInstruFunc(wasm),
        ...userDefinedImportsObject,
      } as ASImports;
      const binary = await readFile(wasm);
      const ins = await instantiate(binary, importObject);
      importsArg.module = ins.module;
      importsArg.instance = ins.instance;
      importsArg.exports = ins.exports;
      try {
        wasi.start(ins);
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.stack);
        }
        throw new Error("node executor abort.");
      }
    })
  );
}

export async function execWasmBinarys(
  outFolder: string,
  instrumentResult: InstrumentResult[],
  imports: Imports
): Promise<AssertResult> {
  const assertRes = new AssertResult();
  ensureDirSync(outFolder);

  const wasmPaths = instrumentResult.map((res) => res.instrumentedWasm);

  // eslint-disable-next-line unicorn/prefer-ternary

  await nodeExecutor(wasmPaths, outFolder, imports);

  await Promise.all(
    instrumentResult.map(async (res) => {
      const { instrumentedWasm, expectInfo } = res;
      const assertLogFilePath = join(outFolder, basename(instrumentedWasm).slice(0, -4).concat("assert.log"));

      let content;
      try {
        content = await readFile(assertLogFilePath, { encoding: "utf8" });
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.stack);
        }
        throw new Error(`maybe forget call "endTest()" at the end of "*.test.ts" or Job abort before output`);
      }
      const assertResult = JSON.parse(content) as IAssertResult;

      await assertRes.merge(assertResult, expectInfo);
    })
  );
  return assertRes;
}
