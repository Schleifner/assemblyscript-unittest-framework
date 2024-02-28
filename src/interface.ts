/**
 * This file define the interface of coverage information
 */
// input

// instrumented file information
export interface InstrumentResult {
  sourceWasm: string;
  instrumentedWasm: string;
  debugInfo: string;
  expectInfo: string;
}

export type CodeSnippetIndex = number;
export type FunctionIndex = number;
export type LineIndex = number;
export type ColumnIndex = number;
export type FileIndex = number;

// input cov
export type BranchInfo = [CodeSnippetIndex, CodeSnippetIndex];
export type BranchInfos = BranchInfo[];

export type LineRange = [FileIndex, LineIndex, ColumnIndex][];
export type LineInfos = (LineRange | null)[];
export type LineInfoMap = Map<number, Set<LineIndex>>;

export interface CovDebugInfo {
  branchInfo: BranchInfos;
  index: FunctionIndex;
  lineInfo: LineInfos;
}

export interface CovInfo {
  branchInfo: BranchInfos;
  lineInfo: LineInfoMap;
}

export interface DebugInfo {
  debugInfos: Record<string, CovDebugInfo>;
  debugFiles: string[];
}

// input c++ runtime
export type CovTrace = [FunctionIndex, CodeSnippetIndex];
export type TestCaseName = string;

export type ExpectInfoIndex = string;
export type AssertExpectValue = string;
export type AssertActualValue = string;
export type AssertMessages = [ExpectInfoIndex, AssertActualValue, AssertExpectValue][];
export type AssertFailMessage = Record<TestCaseName, AssertMessages>;

export type ErrorMessages = string[];
export type AssertErrorMessages = Map<TestCaseName, ErrorMessages>;

export type ExpectInfoDebugLocation = string;
export type ExpectInfo = Record<ExpectInfoIndex, ExpectInfoDebugLocation>;

export interface IAssertResult {
  fail: number;
  total: number;
  failed_info: AssertFailMessage;
}

// output
export class Rate {
  used = 0;
  total = 0;
  getRate(): number {
    return this.total === 0 ? 100 : Math.round((this.used / this.total) * 10000) / 100;
  }
  toString(): string {
    return `${this.used}/${this.total}`;
  }
  static summarize(rates: Rate[]): Rate {
    return rates.reduce((prev, curr) => {
      prev.used += curr.used;
      prev.total += curr.total;
      return prev;
    }, new Rate());
  }
}
export class FileCoverageResult {
  constructor(public filename: string) {}
  statementCoverageRate: Rate = new Rate();
  branchCoverageRate: Rate = new Rate();
  functionCoverageRate: Rate = new Rate();
  lineCoverageRate: Rate = new Rate();
  sourceUsedCount: CodeCoverage[] = [];
}

export class FunctionCoverageResult {
  constructor(public functionName: string) {}
  branchCoverageRate: Rate = new Rate();
  lineRange: [number, number] = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
  /**
   * first means lineIndex;
   * second means usedCount;
   */
  sourceUsedCount = new Map<number, number>();

  /**
   * Now assemblyscrpt will compile foo<T>() to different function like foo<f64>() , foo<u32>() etc;
   * We need merge the generic function to foo() for coverage statistics
   */
  static mergeFromGeneric(nameWithoutGeneric: string, infos: FunctionCoverageResult[]): FunctionCoverageResult {
    const result = new FunctionCoverageResult(nameWithoutGeneric);
    result.lineRange = [
      Math.min(...infos.map((info) => info.lineRange[0])),
      Math.max(...infos.map((info) => info.lineRange[1])),
    ];
    result.branchCoverageRate = Rate.summarize(infos.map((info) => info.branchCoverageRate));
    for (const info of infos) {
      for (const [lineIndex, count] of info.sourceUsedCount.entries()) {
        const srcLineUsedCount = result.sourceUsedCount.get(lineIndex);
        result.sourceUsedCount.set(lineIndex, srcLineUsedCount === undefined ? count : srcLineUsedCount + count);
      }
    }
    return result;
  }
}

export class CodeCoverage {
  static readonly default = -1;
  source: string;
  /**
   * Default means not a effect line;
   * 0 means not used but effect;
   * more than 0 means a used line;
   */
  usedCount: number = CodeCoverage.default;
  constructor(src: string) {
    this.source = src;
  }
}

export interface UnittestPackage {
  readonly testCodePaths: string[];
  readonly sourceFunctions: Map<string, SourceFunctionInfo[]>;
}

export interface SourceFunctionInfo {
  name: string;
  range: [number, number];
}
