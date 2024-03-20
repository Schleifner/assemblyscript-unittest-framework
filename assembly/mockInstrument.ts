export declare namespace mockFunctionStatus {
  function clear(): void;
  function set(k: u32, v: u32): void;
  function get(k: u32): u32;
  function lastGet(): u32;
  function has(k: u32): bool;
  function getCalls(oldIndex: u32, newIndex: u32): u32;
  function setIgnore(k: u32, v: bool): void;
}

export class MockFn {
  get calls(): u32 {
    return mockFunctionStatus.getCalls(this.oldIndex, this.newIndex);
  }
  constructor(
    public oldIndex: u32,
    public newIndex: u32,
  ) {}
}
