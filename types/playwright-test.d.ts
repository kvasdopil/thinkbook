/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@playwright/test' {
  // NOTE: This is a stub declaration so that TypeScript compilation passes
  // before the real Playwright types are installed. It deliberately keeps the
  // surface minimal – the test runner provides these globals at runtime.
  export const test: any
  export const expect: any
  export type Page = any
  export type ConsoleMessage = any
  export type Dialog = any
  export type Route = any
}
