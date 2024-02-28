import { SourceFunctionInfo } from "../interface.ts";

declare global {
  // store listFunctions transform results in global
  let functionInfos: SourceFunctionInfo[];
}

export {};
