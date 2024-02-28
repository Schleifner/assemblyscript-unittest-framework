import { toJson } from "./formatPrint";

class AssertResultCollector {
  total: u32 = 0;
  fail: u32 = 0;
  failed_info: Map<string, string[][]> = new Map();
  currentTestDescriptions: string[] = [];

  addDescription(descript: string): void {
    this.currentTestDescriptions.push(descript);
  }
  removeDescription(): void {
    this.currentTestDescriptions.pop();
  }
  collectCheckResult(result: bool, codeInfoIndex: u32, actualValue: string, expectValue: string): void {
    this.total++;
    if (!result) {
      this.fail++;
      const testCaseFullName = this.currentTestDescriptions.join(" - ");
      const assertMessage = [codeInfoIndex.toString(), actualValue, expectValue];
      if (this.failed_info.has(testCaseFullName)) {
        this.failed_info.get(testCaseFullName).push(assertMessage);
      } else {
        this.failed_info.set(testCaseFullName, [assertMessage]);
      }
    }
  }

  clear(): void {
    this.failed_info = new Map();
    this.currentTestDescriptions = [];
    __collect();
  }

  totalString(): string {
    return `"total":` + this.total.toString();
  }
  failString(): string {
    return `"fail":` + this.fail.toString();
  }
  failInfoString(): string {
    return `"failed_info":` + toJson(this.failed_info);
  }
}

export const assertResult = new AssertResultCollector();
