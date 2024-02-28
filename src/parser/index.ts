import fs from "fs-extra"; // eslint-disable-line import/no-named-as-default-member
import { readFile } from "node:fs/promises";
import { checkFunctionName, checkGenerics, isIncluded, json2map } from "../utils/index.js";
import { SingleFileCoverageAnalysis } from "./singleFileAnalysis.js";
import { SingleFunctionCoverageAnalysis } from "./singleFunctionAnalysis.js";
import {
  FileCoverageResult,
  CodeSnippetIndex,
  CovInfo,
  CovTrace,
  DebugInfo,
  FunctionIndex,
  LineInfoMap,
  FunctionCoverageResult,
  SourceFunctionInfo,
  LineRange,
} from "../interface.js";

export class Parser {
  fileCoverageResults: FileCoverageResult[] = [];
  functionCoverageResults: FunctionCoverageResult[] = [];
  /** key: functionName, value: CodeSnippetIndex trace */
  functionCovTraceMap = new Map<string, CodeSnippetIndex[]>();
  /** key: functionName, value: { branchInfo, lineInfo } */
  functionCovInfoMap = new Map<string, CovInfo>();

  async parse(
    debugInfoFiles: string[],
    sourceFunctions: Map<string, SourceFunctionInfo[]>
  ): Promise<FileCoverageResult[]> {
    for (const debugInfoFile of debugInfoFiles) {
      await this.traceParse(debugInfoFile);
    }
    this.generateFunctionCoverage();
    await this.generateFileCoverage(sourceFunctions);
    return this.fileCoverageResults;
  }

  private async getTempCovTraceMap(traceFile: string) {
    // eslint-disable-next-line import/no-named-as-default-member
    const traces = (await fs.readJson(traceFile)) as CovTrace[];
    const tempCovTraceMap = new Map<FunctionIndex, CodeSnippetIndex[]>();
    for (const trace of traces) {
      const [funIndex, codeSnippetIndex] = trace;
      const codeIndexs = tempCovTraceMap.get(funIndex);
      if (codeIndexs) {
        codeIndexs.push(codeSnippetIndex);
      } else {
        tempCovTraceMap.set(funIndex, [codeSnippetIndex]);
      }
    }
    return tempCovTraceMap;
  }

  private async getDebugInfos(debugInfoFile: string) {
    // eslint-disable-next-line import/no-named-as-default-member
    const debugInfo = (await fs.readJson(debugInfoFile)) as DebugInfo;
    const debugInfos = json2map(debugInfo.debugInfos);
    const debugFiles = debugInfo.debugFiles;
    return { debugInfos, debugFiles };
  }

  /**
   * @brief
   * parse debugInfo and traceInfo to functionCovTraceMap and functionCovInfoMap
   * @param debugInfoFile debugInfo file path generated by instrumenter
   */
  async traceParse(debugInfoFile: string) {
    const traceFile = debugInfoFile.slice(0, -14).concat("trace");

    const [tempCovTraceMap, { debugInfos, debugFiles }] = await Promise.all([
      this.getTempCovTraceMap(traceFile),
      this.getDebugInfos(debugInfoFile),
    ]);

    for (const [name, info] of debugInfos) {
      const traces = tempCovTraceMap.get(info.index);
      if (traces !== undefined) {
        const originTraces = this.functionCovTraceMap.get(name) ?? [];
        this.functionCovTraceMap.set(name, originTraces.concat(traces));
      }
      const lineInfoMap: LineInfoMap = new Map();
      // eslint-disable-next-line unicorn/no-array-for-each
      info.lineInfo.forEach((ranges: LineRange | null, index: number) => {
        // If instrument return basic block == null, ignore it.
        if (ranges === null) return;
        const lineInfoArray = ranges
          .filter((range) => {
            const filename = debugFiles[range[0]];
            if (filename === undefined) {
              throw new Error(`unknown erorr: not find fileIndex ${range[0]} in ${debugInfoFile}`);
            }
            // if basicBlock is inline function from other files, ignore it
            return checkFunctionName(filename, name);
          })
          .map((range) => range[1]);
        // basic block index start at 0
        lineInfoMap.set(index, new Set(lineInfoArray));
      });
      const covInfo: CovInfo = { branchInfo: info.branchInfo, lineInfo: lineInfoMap };
      this.functionCovInfoMap.set(name, covInfo);
    }
  }

  /**
   * @brief
   * generate FunctionCoverageInfo for each Function based on CovTrace and CovInfo.
   * FunctionCoverageInfo of Function<T> will be merged into Function:
   * FunctionCoverageInfo of toJson<f64> and toJson<i32> will be merged into toJson.
   */
  generateFunctionCoverage() {
    const genericFunctionCovInfoMap = new Map<string, FunctionCoverageResult[]>();

    for (const [functionName, singleFunctionCovTrace] of this.functionCovTraceMap.entries()) {
      const singleFunctionCovInfo = this.functionCovInfoMap.get(functionName);
      if (singleFunctionCovInfo === undefined) {
        throw new Error(`CovInfo And CovTrace of Function ${functionName} mismatch`);
      }
      const singleFunctionAnalysis = new SingleFunctionCoverageAnalysis(singleFunctionCovInfo, functionName);
      const singleFunctionCoverageInfo = singleFunctionAnalysis.update(singleFunctionCovTrace);
      const functionNameWithoutGeneric = checkGenerics(functionName);
      if (functionNameWithoutGeneric) {
        const genericFunctioncovInfos = genericFunctionCovInfoMap.get(functionNameWithoutGeneric);
        if (genericFunctioncovInfos) {
          genericFunctioncovInfos.push(singleFunctionCoverageInfo);
        } else {
          genericFunctionCovInfoMap.set(functionNameWithoutGeneric, [singleFunctionCoverageInfo]);
        }
      } else {
        this.functionCoverageResults.push(singleFunctionCoverageInfo);
      }
    }

    for (const [name, infos] of genericFunctionCovInfoMap) {
      this.functionCoverageResults.push(FunctionCoverageResult.mergeFromGeneric(name, infos));
    }
  }

  /**
   * @brief
   * For each sourceFile:
   *  First, filter out all functionCoverageResult from this.functionCoverageResults based on checkFunctionName(sourceFilePath, functionName).
   *  And then, find out which sourceFunction has been tested and which sourceFunction has not been tested.
   *    based on the function name match or lineRange match.
   *  Finally, merge the functionCoverageResult to fileCoverageResult.
   * @param sourceFunctions functionInfo of source file generated by transform.
   */
  async generateFileCoverage(sourceFunctions: Map<string, SourceFunctionInfo[]>) {
    for (const [sourceCodePath, sourceFunctionInfos] of sourceFunctions.entries()) {
      const source = await readFile(sourceCodePath, { encoding: "utf8" });
      const singleFileAnalysis = new SingleFileCoverageAnalysis(sourceCodePath, source);

      singleFileAnalysis.setTotalFunction(sourceFunctionInfos.length);

      const testedFunctions = new Set<number>();
      const singleFileFunctionCovInfos = this.functionCoverageResults
        .filter((result) => checkFunctionName(sourceCodePath, result.functionName))
        .filter((result) => {
          const index = sourceFunctionInfos.findIndex(
            // For each FunctionCoverageResult <generated by intrumentation>:
            // check If one of the SourceFunctions can be matched with result by name matching and line range matching
            (v) => result.functionName === v.name || isIncluded(result.lineRange, v.range)
          );
          if (index !== -1) {
            testedFunctions.add(index);
            return true;
          }
          return false;
        });
      singleFileAnalysis.merge(singleFileFunctionCovInfos);

      const unTestedFunctionRanges = sourceFunctionInfos
        .filter((info, index) => !testedFunctions.has(index))
        .map((info) => info.range);
      singleFileAnalysis.setUnTestedFunction(unTestedFunctionRanges);
      this.fileCoverageResults.push(singleFileAnalysis.getResult());
    }
  }
}