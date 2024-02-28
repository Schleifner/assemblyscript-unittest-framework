import { WASI } from "node:wasi";
import { promises } from "node:fs";
import { spawn } from "cross-spawn";
import { ensureDirSync } from "fs-extra";
import { basename, join } from "node:path";
import { instantiate, Imports as ASImports } from "@assemblyscript/loader";
import { AssertResult } from "../assertResult.js";
import { Imports, ImportsArgument } from "../index.js";
import { splitCommand } from "../utils/pathResolver.js";
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
function cppExecutor(wasms: string[], outFolder: string, runtime: string) {
  return Promise.all(
    // eslint-disable-next-line @typescript-eslint/require-await
    wasms.map(async (wasm) => {
      const { cmd, argv } = splitCommand(`${runtime} -j ./${wasm} -p ./${outFolder} -v cpp -v ${basename(wasm)}`);
      const executor = spawn(cmd, argv, { timeout: 60 * 1000 });
      executor.stdout.on("data", (data: string | Uint8Array) => process.stdout.write(data));
      executor.stderr.on("data", (data_1: string | Uint8Array) => process.stderr.write(data_1));
      executor.on("close", (code, signal) => {
        if (code === 0) {
          return;
        } else {
          const codeString = code?.toString() ?? "unknown";
          const signalString = signal?.toString() ?? "unknown";
          throw new Error(`cpp executor abort. return code ${codeString}, signal: ${signalString}`);
        }
      });
    })
  );
}

export async function execWasmBinarys(
  runtime: string,
  outFolder: string,
  instrumentResult: InstrumentResult[],
  imports: Imports
): Promise<AssertResult> {
  const assertRes = new AssertResult();
  ensureDirSync(outFolder);

  const wasmPaths = instrumentResult.map((res) => res.instrumentedWasm);

  // eslint-disable-next-line unicorn/prefer-ternary
  if (runtime === "node") {
    await nodeExecutor(wasmPaths, outFolder, imports);
  } else {
    await cppExecutor(wasmPaths, outFolder, runtime);
  }

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
