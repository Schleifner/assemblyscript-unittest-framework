import { Value } from "./expect";
import {
  describeImpl,
  mockImpl,
  remockImpl,
  testImpl,
  unmockImpl,
} from "./implement";
import { output } from "./output";
import { MockFn } from "./mockInstrument";
export { MockFn } from "./mockInstrument";

/**
 *  describe a test group
 * @param description common description of each test inside
 * @param testsFunction can call multi-time test
 */
export function describe(description: string, testsFunction: () => void): void {
  describeImpl(description, testsFunction);
}

/**
 *  run a test
 * @param description test description
 * @param testFunction main function of test
 */
export function test(description: string, testFunction: () => void): void {
  testImpl(description, testFunction);
}

/**
 *  mock some function
 * @param oldFunction function you want to mock
 * @param newFunction the new function.
 * @returns Mock Status { callTime : u32}
 */
export function mock<T extends Function>(
  oldFunction: T,
  newFunction: T,
): MockFn {
  return mockImpl<T>(oldFunction, newFunction);
}
/**
 * unmock this function, can only be used in mocked function
 */
export function unmock<T extends Function>(oldFunction: T): void {
  unmockImpl(oldFunction);
}
/**
 * remock this function, can only be used in mocked function. Pair of {unmock}
 */
export function remock<T extends Function>(oldFunction: T): void {
  remockImpl(oldFunction);
}

export function expect<T>(value: T): Value<T> {
  return new Value<T>(value);
}

export function endTest(): void {
  output();
}
